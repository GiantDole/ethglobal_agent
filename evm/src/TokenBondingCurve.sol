// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
// Import the Chainlink Aggregator interface for ETH/USD price feed
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./TokenBondingCurveFactory.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

using ECDSA for bytes32;

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
 */
contract TokenBondingCurve is ERC20, Ownable, ReentrancyGuard {
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

    // Add factory reference
    TokenBondingCurveFactory public immutable factory;

    // Add state variables
    uint256 private constant PRICE_FRESHNESS_THRESHOLD = 3600; // 1 hour

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
    event LiquidityDeployed(uint256 tokenAmount, uint256 ethAmount, uint256 liquidity);

    /**
     * @notice Constructor.
     * @param name_ The token name.
     * @param symbol_ The token symbol.
     * @param _totalSupplyTokens The total supply (in whole tokens). Tokens will be scaled by decimals().
     * @param _basePriceUsd The base USD price per token (8 decimals, e.g., 100e8 for $100).
     * @param _slopeUsd The USD increase per token sold (8 decimals, e.g., 1e8 for a $1 increment).
     * @param _factory The factory address.
     * @param _priceFeed The address of the Chainlink ETH/USD price feed.
     * @param _targetMarketCapUsd The target market cap (in USD, 8 decimals) that must be reached before liquidity can be deployed.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _totalSupplyTokens,
        uint256 _basePriceUsd,
        uint256 _slopeUsd,
        address _factory,
        address _priceFeed,
        uint256 _targetMarketCapUsd
    )
        ERC20(name_, symbol_) Ownable(msg.sender)
    {
        require(_factory != address(0), "Factory address cannot be zero");
        factory = TokenBondingCurveFactory(_factory);
        require(_priceFeed != address(0), "Price feed address cannot be zero");
        require(_targetMarketCapUsd > 0, "Target market cap must be > 0");

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
     * - The number of tokens to buy (as a whole number, must be <= tokenAllocation).
     * - The tokenAllocation, which is the maximum number of tokens the buyer is allowed to buy.
     * - A user-specific nonce (which must be greater than any previously used nonce for this user).
     * - A signature from the agent approving the purchase.
     *
     * The signature must be generated off-chain as follows (using ethers.js for example):
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
     * @param tokenAllocation The maximum number of tokens the user is allowed to buy.
     * @param nonce A user-specific nonce.
     * @param signature The agent's signature (must sign the message hash).
     */
    function buy(
        uint256 numTokens,
        uint256 tokenAllocation,
        uint256 nonce,
        bytes calldata signature
    ) external payable nonReentrant {
        require(numTokens > 0, "Must buy at least one token");
        require(numTokens <= tokenAllocation, "Cannot buy more than allocation");
        require(nonce > nonces[msg.sender], "Invalid nonce");

        // Construct the message hash and recover signer.
        bytes32 messageHash = keccak256(abi.encode(msg.sender, nonce, address(this), tokenAllocation));
        address agent = factory.getAgent();
        address recovered = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(messageHash), signature);
        require(recovered == agent, "Invalid agent signature");

        // Update nonce so signatures cannot be replayed.
        nonces[msg.sender] = nonce;

        // Calculate the cost in USD (8 decimals).
        uint256 costUsd = numTokens * basePriceUsd +
            slopeUsd * (numTokens * tokensSold + (numTokens * (numTokens - 1)) / 2);

        // Convert the ETH sent into USD using the helper (rounds down).
        uint256 depositUsd = _convertEthToUsd(msg.value);
        require(depositUsd >= costUsd, "Insufficient ETH for token purchase");

        // If the buyer overpays, compute the ETH refund.
        uint256 refundEth = 0;
        if (depositUsd > costUsd) {
            uint256 refundUsd = depositUsd - costUsd;
            refundEth = _convertUsdToEth(refundUsd);
        }

        // Update the tokens sold.
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
    function sell(uint256 numTokens) external nonReentrant {
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
     * @notice Deploy liquidity to Uniswap by depositing tokens and ETH at the correct price.
     *
     * The contract determines the current token price (in USD) based on the bonding curve:
     *   currentPriceUsd = basePriceUsd + slopeUsd * tokensSold.
     *
     * It then checks the available ETH in the contract and calculates:
     *   usdAvailable = (ETH available * latest ETH/USD price) / 1e18.
     *
     * From this, it computes the ideal number of tokens (in whole tokens) that should be
     * paired with the available ETH to maintain the current price:
     *   idealTokenWhole = usdAvailable / currentPriceUsd.
     *
     * Next, the unsold tokens (held in the contract) are converted to whole tokens.
     * If there are enough tokens to cover the idealTokenWhole, liquidity is deployed using
     * exactly idealTokenWhole tokens and all available ETH. Otherwise, if tokens are insufficient,
     * it uses all available tokens and calculates the ETH that exactly matches that token amount.
     *
     * After liquidity is deployed (and only once maturity is reached), any remaining tokens and ETH
     * can later be withdrawn by the owner (via withdrawRemaining).
     */
    function deployLiquidity() external nonReentrant {
        require(!liquidityDeployed, "Liquidity already deployed");

        // Calculate the current token price in USD (with 8 decimals).
        uint256 currentPriceUsd = basePriceUsd + (slopeUsd * tokensSold);

        // Check that the target market cap is reached.
        uint256 currentMarketCapUsd = tokensSold * currentPriceUsd;
        require(currentMarketCapUsd >= targetMarketCapUsd, "Target market cap not reached");

        require(address(uniswapRouter) != address(0), "Uniswap router not set");

        // Get the unsold token balance (in smallest units) stored in the contract.
        uint256 tokenBalance = balanceOf(address(this));
        require(tokenBalance > 0, "No tokens available for liquidity");

        // Get the available ETH in the contract.
        uint256 ethAvailable = address(this).balance;
        require(ethAvailable > 0, "No ETH available for liquidity");

        // Convert available ETH into its USD value (8 decimals) using the Chainlink price feed.
        uint256 usdAvailable = (ethAvailable * getLatestEthPrice()) / 1e18;
        // Determine the ideal number of tokens (in whole tokens) that should be paired with the ETH.
        uint256 idealTokenWhole = usdAvailable / currentPriceUsd;

        // Convert the token balance to whole tokens.
        uint256 tokenBalanceWhole = tokenBalance / (10 ** decimals());

        uint256 tokensToDeployWhole;
        uint256 usedEth;

        if (tokenBalanceWhole >= idealTokenWhole && idealTokenWhole > 0) {
            // There are more unsold tokens than needed to match the available ETH.
            // Deploy liquidity using exactly idealTokenWhole tokens and all available ETH.
            tokensToDeployWhole = idealTokenWhole;
            usedEth = ethAvailable;
        } else {
            // Not enough tokens to cover the full ETH available.
            // Use all available tokens and compute the matching ETH.
            tokensToDeployWhole = tokenBalanceWhole;
            uint256 requiredUsd = tokensToDeployWhole * currentPriceUsd;
            usedEth = (requiredUsd * 1e18) / getLatestEthPrice();
        }

        require(tokensToDeployWhole > 0, "Calculated token amount is zero");
        require(usedEth > 0, "Calculated ETH amount is zero");

        // Convert the whole token count back to the token's smallest units.
        uint256 tokensToDeploy = tokensToDeployWhole * (10 ** decimals());

        // Approve the Uniswap router to spend the tokens.
        _approve(address(this), address(uniswapRouter), tokensToDeploy);

        // Set a deadline for the liquidity addition (e.g., 15 minutes in the future).
        uint256 deadline = block.timestamp + 15 minutes;

        // Add minimum amounts for slippage protection
        uint256 minTokens = (tokensToDeploy * 95) / 100;  // 5% slippage
        uint256 minEth = (usedEth * 95) / 100;  // 5% slippage

        // Call the Uniswap router to add liquidity using the calculated token and ETH amounts.
        (uint256 usedTokenAmount, uint256 usedETH, uint256 liquidity) = uniswapRouter.addLiquidityETH{value: usedEth}(
            address(this),
            tokensToDeploy,
            minTokens,    // Minimum tokens to add
            minEth,       // Minimum ETH to add
            owner(),
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
        (, int256 answer, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(answer > 0, "Invalid price data");
        //require(block.timestamp - updatedAt <= PRICE_FRESHNESS_THRESHOLD, "Stale price data");
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
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        // Until liquidity is deployed, only allow transfers if either the sender or receiver is the contract.
        if (!liquidityDeployed && from != address(this) && to != address(this)) {
            require(from == address(this) || to == address(this), "Token transfers are locked until liquidity is deployed");
        }
        super._update(from, to, value);
    }

    /// @notice Allow the contract to receive ETH.
    receive() external payable {}

    /**
     * @dev Convert ETH (in wei) to its USD value (8 decimals) rounding down.
     * Rounding down here ensures that a buyer's ETH is valued slightly lower than
     * the true conversion rate — a worse price for the user.
     */
    function _convertEthToUsd(uint256 ethAmount) internal view returns (uint256) {
        return (ethAmount * getLatestEthPrice()) / 1e18;
    }

    /**
     * @dev Convert a USD amount (8 decimals) to ETH (in wei) rounding down.
     * Rounding down here means that a seller receives slightly less ETH than the exact
     * conversion would yield — again, a worse price for the user.
     */
    function _convertUsdToEth(uint256 usdAmount) internal view returns (uint256) {
        return (usdAmount * 1e18) / getLatestEthPrice();
    }

    /**
     * @notice Withdraw remaining ETH and tokens from the contract after liquidity is deployed.
     *
     * This function can only be called after liquidity has been deployed.
     * It sends all remaining ETH to the owner and transfers any unsold tokens from the contract.
     */
    function withdrawRemaining() external onlyOwner {
        require(liquidityDeployed, "Liquidity not deployed yet");

        // Withdraw any remaining ETH.
        uint256 remainingEth = address(this).balance;
        if (remainingEth > 0) {
            (bool success, ) = owner().call{value: remainingEth}("");
            require(success, "ETH withdrawal failed");
        }

        // Withdraw any remaining tokens.
        uint256 remainingTokens = balanceOf(address(this));
        if (remainingTokens > 0) {
            _transfer(address(this), owner(), remainingTokens);
        }
    }

    /**
     * @notice Calculate how much more USD/ETH is needed to reach maturity
     * @return remainingUsd Amount in USD (8 decimals) needed to reach target market cap
     * @return remainingEth Approximate amount in ETH (18 decimals) needed to reach target market cap
     */
    function getRemainingToMaturity() public view returns (uint256 remainingUsd, uint256 remainingEth) {
        // Calculate current market cap
        uint256 currentPriceUsd = basePriceUsd + (slopeUsd * tokensSold);
        uint256 currentMarketCapUsd = tokensSold * currentPriceUsd;
        
        // If we've already reached target, return 0
        if (currentMarketCapUsd >= targetMarketCapUsd) {
            return (0, 0);
        }
        
        // Calculate remaining USD needed
        remainingUsd = targetMarketCapUsd - currentMarketCapUsd;
        
        // Convert to approximate ETH amount using current ETH price
        remainingEth = _convertUsdToEth(remainingUsd);
        
        return (remainingUsd, remainingEth);
    }
}