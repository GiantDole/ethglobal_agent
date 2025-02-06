// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
// Import the Chainlink Aggregator interface for ETH/USD price feed
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @dev Minimal Uniswap V2 Router interface
 */
interface IUniswapV2Router02 {
    function addLiquidityETH(
         address token,
         uint256 amountTokenDesired,
         uint256 amountTokenMin,
         uint256 amountETHMin,
         address to,
         uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
}

/**
 * @title TokenBondingCurve
 * @notice An ERC20 token that is traded using a bonding curve mechanism.
 *
 * The contract mints a fixed supply (provided at deployment) to itself.
 * Users may buy tokens by sending ETH. The purchase price is computed by:
 *
 *   costUsd = numTokens * basePriceUsd +
 *             slopeUsd * (numTokens * tokensSold + (numTokens*(numTokens-1))/2)
 *
 * The ETH deposit is converted into USD using the Chainlink ETH/USD price
 * feed (which returns a price with 8 decimals). If the ETH deposit exceeds the
 * required USD value the surplus is refunded.
 *
 * The buy() function requires an agent signature approving the purchase.
 * The signature is computed off-chain as:
 *
 *   messageHash = keccak256(abi.encode(
 *                        evmAddress,
 *                        nonce,
 *                        tokenContract,
 *                        Math.floor(tokenAllocation)
 *                   ));
 *
 * The contract uses a mapping of nonces to ensure that no signature can be reused.
 *
 * Users can also sell tokens back to the contract and get an ETH refund that is computed
 * on the inverse bonding curve.
 *
 * Additional features:
 * - Until liquidity is deployed (i.e., maturity of bonding curve), token transfers between EOAs are locked.
 *   Only transfers from the contract (i.e., in buy) or to the contract (i.e., in sell) are allowed.
 * - Once the target market cap is reached, the owner can deploy liquidity by adding the contract's remaining tokens and ETH
 *   into a Uniswap liquidity pool.
 * - The owner may withdraw ETH from the contract and update the agent key.
 */
contract TokenBondingCurve is ERC20, Ownable {
    using ECDSA for bytes32;

    // The agent address whose signatures are required.
    address public agent;

    // A mapping to store the last nonce used for each user.
    mapping(address => uint256) public nonces;

    // Bonding curve parameters (prices expressed in USD with 8 decimals)
    uint256 public basePriceUsd;
    uint256 public slopeUsd;
    uint256 public targetMarketCapUsd;

    // Track how many tokens (in whole tokens, not smallest units) have been sold.
    uint256 public tokensSold;

    // Chainlink price feed for ETH/USD.
    AggregatorV3Interface public priceFeed;

    // Total fixed supply is provided at deployment (in whole tokens)
    uint256 public immutable totalSupplyTokens;

    // Flag to ensure liquidity is only deployed once.
    bool public liquidityDeployed;

    // Uniswap V2 router instance.
    IUniswapV2Router02 public uniswapRouter;

    // ========== Events ==========
    event TokensBought(
        address indexed buyer,
        uint256 numTokens,
        uint256 costUsd,
        uint256 ethPaid,
        uint256 refundEth
    );
    event TokensSold(
        address indexed seller,
        uint256 numTokens,
        uint256 refundUsd,
        uint256 ethRefunded
    );
    event AgentUpdated(address indexed oldAgent, address indexed newAgent);
    event LiquidityDeployed(uint256 tokenAmount, uint256 ethAmount, uint256 liquidity);

    /**
     * @notice Constructor.
     * @param name_ The token name.
     * @param symbol_ The token symbol.
     * @param _totalSupplyTokens The total supply (in whole tokens). Tokens will be scaled by decimals().
     * @param _basePriceUsd The base USD price per token (8 decimals, e.g., 100e8 for $100).
     * @param _slopeUsd The USD increase per token sold (8 decimals, e.g., 1e8 for a $1 increment).
     * @param _agent The agent address whose signatures are required.
     * @param _priceFeed The address of the Chainlink ETH/USD price feed.
     * @param _targetMarketCapUsd The target market cap (in USD, 8 decimals) that must be reached before liquidity can be deployed.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _totalSupplyTokens,
        uint256 _basePriceUsd,
        uint256 _slopeUsd,
        address _agent,
        address _priceFeed,
        uint256 _targetMarketCapUsd
    ) ERC20(name_, symbol_) {
        require(_agent != address(0), "Agent address cannot be zero");
        require(_priceFeed != address(0), "Price feed address cannot be zero");
        require(_targetMarketCapUsd > 0, "Target market cap must be > 0");

        agent = _agent;
        basePriceUsd = _basePriceUsd;
        slopeUsd = _slopeUsd;
        totalSupplyTokens = _totalSupplyTokens;
        targetMarketCapUsd = _targetMarketCapUsd;

        // Mint the entire fixed supply to the contract for sale.
        _mint(address(this), _totalSupplyTokens * (10 ** decimals()));

        // Initialize the Chainlink price feed.
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    /**
     * @notice Sets the Uniswap V2 router address.
     * @param routerAddress The address of the Uniswap V2 router.
     */
    function setUniswapRouter(address routerAddress) external onlyOwner {
        require(routerAddress != address(0), "Router address cannot be zero");
        uniswapRouter = IUniswapV2Router02(routerAddress);
    }

    /**
     * @notice Buy tokens by depositing ETH.
     *
     * The buyer must provide:
     * - The number of tokens to buy (as a whole number).
     * - A user-specific nonce (which must be greater than any previously used nonce for this user).
     * - A signature from the agent approving the purchase.
     *
     * The signature must be generated offline as follows (using ethers.js for example):
     *
     *   const messageHash = ethers.keccak256(
     *       ethers.AbiCoder.defaultAbiCoder().encode(
     *           ["address", "uint256", "address", "uint256"],
     *           [userAddress, nonce, tokenContractAddress, Math.floor(tokenAllocation)]
     *       )
     *   );
     *
     * The signature is then recovered on-chain and compared to the stored agent address.
     *
     * @param numTokens The number of tokens to buy (in whole tokens).
     * @param nonce A user-specific nonce.
     * @param signature The agent's signature (must sign the message hash).
     */
    function buy(
        uint256 numTokens,
        uint256 nonce,
        bytes calldata signature
    ) external payable {
        require(numTokens > 0, "Must buy at least one token");
        require(nonce > nonces[msg.sender], "Invalid nonce");

        // Reproduce the message hash (without a prefix) and then use the standard
        // Ethereum Signed Message hash.
        bytes32 messageHash = keccak256(
            abi.encode(msg.sender, nonce, address(this), numTokens)
        );
        address recovered = messageHash.toEthSignedMessageHash().recover(signature);
        require(recovered == agent, "Invalid agent signature");

        // Update the nonce so the signature cannot be reused.
        nonces[msg.sender] = nonce;

        // Calculate the cost in USD (8 decimals).
        // costUsd = numTokens * basePriceUsd + slopeUsd * (numTokens * tokensSold + (numTokens*(numTokens-1))/2)
        uint256 costUsd = numTokens * basePriceUsd +
            slopeUsd * (numTokens * tokensSold + (numTokens * (numTokens - 1)) / 2);

        // Get the current ETH/USD price (8 decimals).
        uint256 ethUsdPrice = getLatestEthPrice();

        // Convert the ETH sent (msg.value in wei) into USD.
        // depositUsd = (msg.value * ethUsdPrice) / 1e18
        uint256 depositUsd = (msg.value * ethUsdPrice) / 1e18;

        require(depositUsd >= costUsd, "Insufficient ETH for token purchase");

        // If the buyer overpays, compute the ETH refund.
        uint256 refundEth = 0;
        if (depositUsd > costUsd) {
            uint256 refundUsd = depositUsd - costUsd;
            // Convert USD refund back to ETH.
            refundEth = (refundUsd * 1e18) / ethUsdPrice;
        }

        // Update the number of tokens sold.
        tokensSold += numTokens;

        // Transfer tokens from the contract to the buyer.
        uint256 tokenAmount = numTokens * (10 ** decimals());
        require(balanceOf(address(this)) >= tokenAmount, "Not enough tokens available");
        _transfer(address(this), msg.sender, tokenAmount);

        // Refund any excess ETH.
        if (refundEth > 0) {
            (bool successRefund, ) = msg.sender.call{value: refundEth}("");
            require(successRefund, "Refund failed");
        }

        emit TokensBought(msg.sender, numTokens, costUsd, msg.value, refundEth);
    }

    /**
     * @notice Sell tokens back to the contract to receive an ETH refund.
     *
     * The refund is computed using the inverse of the buy pricing function.
     * Assuming the last numTokens tokens were bought at:
     *
     *   costUsd = numTokens * basePriceUsd + slopeUsd * (numTokens * tokensSold + (numTokens*(numTokens-1))/2)
     *
     * then the refund USD value is given by:
     *
     *   refundUsd = numTokens * basePriceUsd + slopeUsd * (numTokens*(tokensSold - numTokens) + (numTokens*(numTokens-1))/2)
     *
     * and the ETH refund is computed by converting refundUsd to ETH using the current
     * ETH/USD price.
     *
     * @param numTokens The number of tokens to sell (in whole tokens).
     */
    function sell(uint256 numTokens) external {
        require(numTokens > 0, "Must sell at least one token");

        uint256 tokenAmount = numTokens * (10 ** decimals());
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");

        // Ensure that tokensSold is at least the number being sold.
        require(tokensSold >= numTokens, "Not enough sold tokens recorded");

        // Compute the refund in USD.
        // refundUsd = numTokens * basePriceUsd + slopeUsd * (numTokens*(tokensSold - numTokens) + (numTokens*(numTokens-1))/2)
        uint256 refundUsd = numTokens * basePriceUsd +
            slopeUsd * (numTokens * (tokensSold - numTokens) + (numTokens * (numTokens - 1)) / 2);

        // Get the ETH/USD price.
        uint256 ethUsdPrice = getLatestEthPrice();

        // Convert the USD refund into ETH.
        uint256 refundEth = (refundUsd * 1e18) / ethUsdPrice;
        require(address(this).balance >= refundEth, "Contract has insufficient ETH for refund");

        // Decrease the tokens sold count.
        tokensSold -= numTokens;

        // Accept tokens back from the seller.
        _transfer(msg.sender, address(this), tokenAmount);

        // Refund ETH to the seller.
        (bool successRefund, ) = msg.sender.call{value: refundEth}("");
        require(successRefund, "ETH refund failed");

        emit TokensSold(msg.sender, numTokens, refundUsd, refundEth);
    }

    /**
     * @notice Update the agent address.
     * Only callable by the owner.
     * @param newAgent The new agent address.
     */
    function updateAgent(address newAgent) external onlyOwner {
        require(newAgent != address(0), "New agent cannot be zero address");
        address oldAgent = agent;
        agent = newAgent;
        emit AgentUpdated(oldAgent, newAgent);
    }

    /**
     * @notice Deploys liquidity to Uniswap by depositing the remaining tokens and ETH 
     *         into a new liquidity pool. This function can only be executed once 
     *         the target market cap is reached (i.e., maturity of the bonding curve).
     *
     * For the current market cap, we calculate:
     *   currentPriceUsd = basePriceUsd + slopeUsd * tokensSold
     *   currentMarketCapUsd = tokensSold * currentPriceUsd
     */
    function deployLiquidity() external {
        require(!liquidityDeployed, "Liquidity already deployed");

        // Calculate the current token price and market cap.
        uint256 currentPriceUsd = basePriceUsd + (slopeUsd * tokensSold);
        uint256 currentMarketCapUsd = tokensSold * currentPriceUsd;
        require(currentMarketCapUsd >= targetMarketCapUsd, "Target market cap not reached");

        require(address(uniswapRouter) != address(0), "Uniswap router not set");

        // Get the total unsold token balance (tokens remaining in the contract).
        uint256 tokenAmount = balanceOf(address(this));
        require(tokenAmount > 0, "No tokens available for liquidity");

        // Get the ETH balance available in the contract.
        uint256 ethAmount = address(this).balance;
        require(ethAmount > 0, "No ETH available for liquidity");

        // Approve the Uniswap router to spend the contract's tokens.
        _approve(address(this), address(uniswapRouter), tokenAmount);

        // Set a deadline (e.g., 15 minutes from now) for the liquidity addition.
        uint256 deadline = block.timestamp + 15 minutes;

        // Call the Uniswap router to add liquidity.
        (uint256 usedTokenAmount, uint256 usedETH, uint256 liquidity) = uniswapRouter.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0,      // Accept any amount of tokens (slippage not handled here)
            0,      // Accept any amount of ETH (slippage not handled here)
            msg.sender, // Send the liquidity pool (LP) tokens to the owner
            deadline
        );

        liquidityDeployed = true;
        emit LiquidityDeployed(usedTokenAmount, usedETH, liquidity);
    }

    /**
     * @notice Retrieves the latest ETH/USD price from the Chainlink aggregator.
     * @return price The latest price (with 8 decimals).
     */
    function getLatestEthPrice() public view returns (uint256 price) {
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        require(answer > 0, "Invalid price data");
        return uint256(answer);
    }

    /**
     * @notice Retrieves the current token price based on the bonding curve.
     * @return price The current token price in USD (8 decimals).
     */
    function getCurrentPrice() public view returns (uint256 price) {
        return basePriceUsd + (slopeUsd * tokensSold);
    }

    /**
     * @notice Override hook to restrict token transfers until liquidity is deployed.
     *         Until liquidity is deployed, transfers between externally owned accounts are locked.
     *         Only transfers from the contract (buy) or to the contract (sell), minting or burning are allowed.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);

        // Allow minting and burning.
        if (from == address(0) || to == address(0)) {
            return;
        }

        // Until liquidity is deployed, only allow transfers if either the sender or receiver is the contract.
        if (!liquidityDeployed) {
            require(from == address(this) || to == address(this), "Token transfers are locked until liquidity is deployed");
        }
    }

    /// @notice Allow the contract to receive ETH.
    receive() external payable {}
}