// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/TokenBondingCurve.sol";
import "../src/TokenBondingCurveFactory.sol";

//=============================================================================
// MockAggregator
//=============================================================================
contract MockAggregator is AggregatorV3Interface {
    uint256 public price; // ETH/USD price with 8 decimals

    constructor(uint256 _price) {
        price = _price;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        // Return the stored price as the answer (with 8 decimals).
        return (0, int256(price), 0, 0, 0);
    }

    // --- Added Missing Functions ---
    function decimals() external pure override returns (uint8) {
        return 8;
    }

    function description() external pure override returns (string memory) {
        return "Mock Aggregator";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }
    
    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        return (0, int256(price), 0, 0, 0);
    }
}

//=============================================================================
// MockUniswapRouter
//=============================================================================
contract MockUniswapRouter is IUniswapV2Router02 {
    // Variables to store the last parameters for verification.
    uint256 private _lastTokenAmount;
    uint256 private _lastEthAmount;
    uint256 public liquidity;
    address public caller;

    // Add getter functions
    function lastTokenAmount() external view returns (uint256) {
        return _lastTokenAmount;
    }

    function lastEthAmount() external view returns (uint256) {
        return _lastEthAmount;
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        override
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 _liquidity
        )
    {
        _lastTokenAmount = amountTokenDesired;
        _lastEthAmount = msg.value;
        caller = msg.sender;
        // For testing purposes, set _liquidity to a dummy value.
        _liquidity = amountTokenDesired + msg.value;
        liquidity = _liquidity;
        return (amountTokenDesired, msg.value, _liquidity);
    }
}

//=============================================================================
// TokenBondingCurveTest
//=============================================================================
contract TokenBondingCurveTest is Test {
    TokenBondingCurve tokenBonding;
    TokenBondingCurveFactory factory;
    MockAggregator aggregator;
    MockUniswapRouter uniswapRouter;

    // Updated parameters to match factory constants
    uint256 constant BASE_PRICE_USD = 0.01e8;     // $0.01
    uint256 constant SLOPE_USD = 0.00000013e8;    // $0.00000013
    uint256 constant TARGET_MARKET_CAP_USD = 500000e8; // $500,000
    uint256 constant TOTAL_SUPPLY_TOKENS = 1_000_000_000; // 1 billion tokens
    
    address owner = address(this);
    address projectLead;
    address agent;
    uint256 agentPrivateKey = 0xBEEF;
    uint256 projectLeadPrivateKey = 0xCAFE;

    function setUp() public {
        // Set agent and project lead addresses via cheatcode
        agent = vm.addr(agentPrivateKey);
        projectLead = vm.addr(projectLeadPrivateKey);

        // Deploy factory first
        factory = new TokenBondingCurveFactory(projectLead, agent);

        // Deploy a mock aggregator with ETH price of $2000
        aggregator = new MockAggregator(2000e8);

        // Deploy the mock Uniswap router
        uniswapRouter = new MockUniswapRouter();

        // Deploy bonding curve through factory
        bytes32 projectId = keccak256("test-project");
        vm.prank(projectLead);
        address payable bondingAddress = payable(factory.deployContract(
            projectId,
            "BondingToken",
            "BOND",
            address(aggregator),
            address(uniswapRouter)
        ));
        tokenBonding = TokenBondingCurve(bondingAddress);
    }

    //--------------------------------------------------------------------------
    // Helper: Generate a valid agent signature.
    //
    // The agent signature is over:
    //   keccak256(abi.encode(buyer, nonce, contractAddress, tokenAllocation))
    //--------------------------------------------------------------------------
    function _getSignature(
        address buyer,
        uint256 nonce,
        uint256 tokenAllocation
    ) internal returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encode(buyer, nonce, address(tokenBonding), tokenAllocation)
        );
        // Need to use the Ethereum Signed Message prefix
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agentPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    //--------------------------------------------------------------------------
    // Test: Successful buy
    //--------------------------------------------------------------------------
    function testBuySuccess() public {
        address buyer = address(1);
        uint256 nonce = 1;
        uint256 tokenAllocation = 20;
        uint256 numTokensToBuy = 10;
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        // Calculate expected USD cost:
        // With tokensSold = 0, costUsd = numTokens * basePriceUsd +
        //     slopeUsd * (numTokens * 0 + (numTokens*(numTokens-1))/2)
        //                 = 10*100e8 + 1e8*(45) = 1000e8 + 45e8 = 1045e8.
        uint256 expectedCostUsd = 1045e8;
        // Required ETH: costEth = (expectedCostUsd * 1e18) / (2000e8)
        uint256 requiredEth = (expectedCostUsd * 1e18) / (2000e8);
        // Add extra ETH to force a refund.
        uint256 depositEth = requiredEth + 0.01 ether;

        vm.prank(buyer);
        vm.deal(buyer, 10 ether);
        tokenBonding.buy{value: depositEth}(numTokensToBuy, tokenAllocation, nonce, signature);

        // Verify buyer received tokens.
        uint256 expectedTokenAmount = numTokensToBuy * (10 ** tokenBonding.decimals());
        assertEq(tokenBonding.balanceOf(buyer), expectedTokenAmount);

        // Ensure tokensSold updated.
        assertEq(tokenBonding.tokensSold(), numTokensToBuy);
    }

    //--------------------------------------------------------------------------
    // Test: Buying more than allowed allocation should revert.
    //--------------------------------------------------------------------------
    function testBuyExceedAllocation() public {
        address buyer = address(1);
        uint256 nonce = 1;
        uint256 tokenAllocation = 5; // Allocation is only 5 tokens
        uint256 numTokensToBuy = 10; // Trying to buy 10
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        // Set up the buyer with ETH
        vm.deal(buyer, 10 ether);
        
        // Only prank once
        vm.prank(buyer);
        vm.expectRevert("Cannot buy more than allocation");
        tokenBonding.buy{value: 1 ether}(numTokensToBuy, tokenAllocation, nonce, signature);
    }

    //--------------------------------------------------------------------------
    // Test: Reusing a nonce (or providing a nonce not greater than previous) fails.
    //--------------------------------------------------------------------------
    function testBuyInvalidNonce() public {
        address buyer = address(1);
        uint256 nonce = 1;
        uint256 tokenAllocation = 20;
        uint256 numTokensToBuy = 5;
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        // First buy with nonce=1.
        vm.prank(buyer);
        vm.deal(buyer, 10 ether);
        tokenBonding.buy{value: 1 ether}(numTokensToBuy, tokenAllocation, nonce, signature);

        // Attempt to reuse nonce.
        bytes memory signature2 = _getSignature(buyer, nonce, tokenAllocation);
        vm.expectRevert("Invalid nonce");
        vm.prank(buyer);
        tokenBonding.buy{value: 1 ether}(numTokensToBuy, tokenAllocation, nonce, signature2);
    }

    //--------------------------------------------------------------------------
    // Test: Using an invalid agent signature reverts.
    //--------------------------------------------------------------------------
    function testBuyInvalidSignature() public {
        address buyer = address(1);
        uint256 nonce = 1;
        uint256 tokenAllocation = 20;
        uint256 numTokensToBuy = 5;
        // Create invalid signature by signing a different tokenAllocation.
        bytes memory wrongSignature = _getSignature(buyer, nonce, tokenAllocation + 1);
        vm.prank(buyer);
        vm.deal(buyer, 10 ether);
        vm.expectRevert("Invalid agent signature");
        tokenBonding.buy{value: 1 ether}(numTokensToBuy, tokenAllocation, nonce, wrongSignature);
    }

    //--------------------------------------------------------------------------
    // Test: Successful sell
    //--------------------------------------------------------------------------
    function testSellSuccess() public {
        address buyer = address(2);
        uint256 nonce = 1;
        uint256 tokenAllocation = 20;
        uint256 buyTokens = 10;
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        // Calculate exact buy amount needed
        uint256 buyPriceUsd = buyTokens * BASE_PRICE_USD +
            SLOPE_USD * (buyTokens * 0 + (buyTokens * (buyTokens - 1)) / 2);
        uint256 buyEthRequired = (buyPriceUsd * 1e18) / (2000e8);  // ETH price is 2000 USD

        vm.prank(buyer);
        vm.deal(buyer, 10 ether);
        tokenBonding.buy{value: buyEthRequired}(buyTokens, tokenAllocation, nonce, signature);

        uint256 buyerTokenBalanceBefore = tokenBonding.balanceOf(buyer);
        uint256 contractEthBefore = address(tokenBonding).balance;

        // Sell 5 tokens
        uint256 sellTokens = 5;
        vm.prank(buyer);
        tokenBonding.sell(sellTokens);

        uint256 expectedRemaining = buyerTokenBalanceBefore - sellTokens * (10 ** tokenBonding.decimals());
        assertEq(tokenBonding.balanceOf(buyer), expectedRemaining);
        assertEq(tokenBonding.tokensSold(), buyTokens - sellTokens);
        // Check that contract ETH balance changed (not checking exact amount)
        assertTrue(address(tokenBonding).balance < contractEthBefore);
    }

    //--------------------------------------------------------------------------
    // Test: Selling without owning tokens should revert.
    //--------------------------------------------------------------------------
    function testSellInsufficientBalance() public {
        address seller = address(3);
        // Set up the seller with ETH
        vm.deal(seller, 10 ether);
        
        // Only prank once
        vm.prank(seller);
        vm.expectRevert("Insufficient token balance");
        tokenBonding.sell(1);
    }

    //--------------------------------------------------------------------------
    // Test: deployLiquidity when there are sufficient unsold tokens.
    //
    // Scenario: A buy occurs so tokensSold > 0. Then ETH is added
    // and liquidity is deployed.
    //--------------------------------------------------------------------------
    function testDeployLiquiditySufficientTokens() public {
        _reachTargetMarketCap();

        // Supply ETH for liquidity
        vm.deal(address(tokenBonding), 1 ether);

        tokenBonding.deployLiquidity();
        assertTrue(tokenBonding.liquidityDeployed());

        uint256 currentPriceUsd = BASE_PRICE_USD + (SLOPE_USD * tokenBonding.tokensSold());
        uint256 requiredUsd = 1 ether * 2000e8 / 1e18;  // Convert 1 ETH to USD
        uint256 tokensToAdd = requiredUsd / currentPriceUsd;  // How many tokens match this ETH value

        uint256 expectedTokenAmount = tokensToAdd * (10 ** tokenBonding.decimals());
        assertEq(uniswapRouter.lastTokenAmount(), expectedTokenAmount, "Token amount mismatch");
        assertEq(uniswapRouter.lastEthAmount(), 1 ether, "ETH amount mismatch");
    }

    //--------------------------------------------------------------------------
    // Test: deployLiquidity when available unsold tokens are insufficient.
    //
    // Scenario: Nearly all tokens are sold so that unsold tokens are few.
    //--------------------------------------------------------------------------
    function testDeployLiquidityInsufficientTokens() public {
        _reachTargetMarketCap();

        // Supply ETH for liquidity
        vm.deal(address(tokenBonding), 10 ether);

        tokenBonding.deployLiquidity();
        assertTrue(tokenBonding.liquidityDeployed());

        uint256 currentPriceUsd = BASE_PRICE_USD + (SLOPE_USD * tokenBonding.tokensSold());
        uint256 requiredUsd = 10 ether * 2000e8 / 1e18;  // Convert 10 ETH to USD
        uint256 tokensToAdd = requiredUsd / currentPriceUsd;  // How many tokens match this ETH value

        uint256 expectedTokenAmount = tokensToAdd * (10 ** tokenBonding.decimals());
        assertEq(uniswapRouter.lastTokenAmount(), expectedTokenAmount);
        assertEq(uniswapRouter.lastEthAmount(), 10 ether);
    }

    //--------------------------------------------------------------------------
    // Test: After liquidity is deployed, the owner can withdraw remaining ETH and tokens.
    //--------------------------------------------------------------------------
    function testWithdrawRemaining() public {
        _reachTargetMarketCap();

        // Deploy liquidity
        vm.deal(address(tokenBonding), 1 ether);

        // Need to be owner to deploy liquidity and withdraw
        vm.startPrank(tokenBonding.owner());
        tokenBonding.deployLiquidity();

        uint256 ownerEthBefore = tokenBonding.owner().balance;
        uint256 remainingTokens = tokenBonding.balanceOf(address(tokenBonding));

        tokenBonding.withdrawRemaining();
        vm.stopPrank();

        assertEq(address(tokenBonding).balance, 0);
        assertEq(tokenBonding.balanceOf(tokenBonding.owner()), remainingTokens);
    }

    //--------------------------------------------------------------------------
    // Test: Buying zero tokens should revert.
    //--------------------------------------------------------------------------
    function testBuyZeroTokens() public {
        address buyer = address(1);
        uint256 nonce = 1;
        uint256 tokenAllocation = 20;
        uint256 numTokens = 0;  // Try to buy 0 tokens
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        vm.prank(buyer);
        vm.deal(buyer, 1 ether);
        vm.expectRevert("Must buy at least one token");
        tokenBonding.buy{value: 1 ether}(numTokens, tokenAllocation, nonce, signature);
    }

    //--------------------------------------------------------------------------
    // Test: Buying more than total supply should revert.
    //--------------------------------------------------------------------------
    function testBuyInsufficientTokensAvailable() public {
        address buyer = address(1);
        uint256 nonce = 1;
        uint256 tokenAllocation = TOTAL_SUPPLY_TOKENS + 1;  // Try to buy more than total supply
        uint256 numTokens = TOTAL_SUPPLY_TOKENS + 1;
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        // Calculate required ETH (even though it will fail)
        uint256 buyPriceUsd = numTokens * BASE_PRICE_USD +
            SLOPE_USD * (numTokens * 0 + (numTokens * (numTokens - 1)) / 2);
        uint256 buyEthRequired = (buyPriceUsd * 1e18) / (2000e8);

        vm.prank(buyer);
        vm.deal(buyer, buyEthRequired);
        vm.expectRevert("Not enough tokens available");
        tokenBonding.buy{value: buyEthRequired}(numTokens, tokenAllocation, nonce, signature);
    }

    //--------------------------------------------------------------------------
    // Test: Selling zero tokens should revert.
    //--------------------------------------------------------------------------
    function testSellZeroTokens() public {
        vm.prank(address(1));
        vm.expectRevert("Must sell at least one token");
        tokenBonding.sell(0);
    }

    //--------------------------------------------------------------------------
    // Test: Selling insufficient contract balance should revert.
    //--------------------------------------------------------------------------
    function testSellInsufficientContractBalance() public {
        // First buy some tokens
        address buyer = address(1);
        uint256 nonce = 1;
        uint256 tokenAllocation = 20;
        uint256 numTokens = 10;
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        // Calculate required ETH
        uint256 buyPriceUsd = numTokens * BASE_PRICE_USD +
            SLOPE_USD * (numTokens * 0 + (numTokens * (numTokens - 1)) / 2);
        uint256 buyEthRequired = (buyPriceUsd * 1e18) / (2000e8);

        vm.startPrank(buyer);
        vm.deal(buyer, buyEthRequired);
        tokenBonding.buy{value: buyEthRequired}(numTokens, tokenAllocation, nonce, signature);
        vm.stopPrank();

        // Set contract's ETH balance to 0 instead of trying to transfer it out
        vm.deal(address(tokenBonding), 0);

        vm.prank(buyer);
        vm.expectRevert("Contract has insufficient ETH for refund");
        tokenBonding.sell(numTokens);
    }

    function testDeployLiquidityTwice() public {
        _reachTargetMarketCap();

        // First deployment
        vm.deal(address(tokenBonding), 10 ether);
        tokenBonding.deployLiquidity();

        // Try to deploy again
        vm.expectRevert("Liquidity already deployed");
        tokenBonding.deployLiquidity();
    }

    function testDeployLiquidityNoTokens() public {
        // Buy all tokens first
        address buyer = address(1);
        uint256 nonce = 1;
        bytes memory signature = _getSignature(buyer, nonce, TOTAL_SUPPLY_TOKENS);

        uint256 buyPriceUsd = TOTAL_SUPPLY_TOKENS * BASE_PRICE_USD +
            SLOPE_USD * (TOTAL_SUPPLY_TOKENS * 0 + (TOTAL_SUPPLY_TOKENS * (TOTAL_SUPPLY_TOKENS - 1)) / 2);
        uint256 buyEthRequired = (buyPriceUsd * 1e18) / (2000e8);

        vm.prank(buyer);
        vm.deal(buyer, buyEthRequired);
        tokenBonding.buy{value: buyEthRequired}(TOTAL_SUPPLY_TOKENS, TOTAL_SUPPLY_TOKENS, nonce, signature);

        vm.expectRevert("No tokens available for liquidity");
        tokenBonding.deployLiquidity();
    }

    function testDeployLiquidityNoEth() public {
        _reachTargetMarketCap();

        vm.deal(address(tokenBonding), 0);

        vm.expectRevert("No ETH available for liquidity");
        tokenBonding.deployLiquidity();
    }

    function testTransferBeforeLiquidity() public {
        // First buy some tokens
        address buyer = address(1);
        uint256 nonce = 1;
        uint256 tokenAllocation = 20;
        uint256 numTokens = 10;
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        uint256 buyPriceUsd = numTokens * BASE_PRICE_USD +
            SLOPE_USD * (numTokens * 0 + (numTokens * (numTokens - 1)) / 2);
        uint256 buyEthRequired = (buyPriceUsd * 1e18) / (2000e8);

        vm.startPrank(buyer);
        vm.deal(buyer, buyEthRequired);
        tokenBonding.buy{value: buyEthRequired}(numTokens, tokenAllocation, nonce, signature);

        // Try to transfer between EOAs before liquidity is deployed
        uint256 transferAmount = numTokens * (10 ** tokenBonding.decimals());
        vm.expectRevert("Token transfers are locked until liquidity is deployed");
        tokenBonding.transfer(address(2), transferAmount);
        vm.stopPrank();
    }

    function testTransferAfterLiquidity() public {
        _reachTargetMarketCap();

        // Deploy liquidity
        vm.deal(address(tokenBonding), 10 ether);
        tokenBonding.deployLiquidity();
        assertTrue(tokenBonding.liquidityDeployed());

        // Now buy more tokens to test transfer
        address secondBuyer = address(2);
        uint256 secondNonce = 1;
        uint256 secondAllocation = 5;
        uint256 secondNumTokens = 2;
        bytes memory signature = _getSignature(secondBuyer, secondNonce, secondAllocation);

        uint256 currentPriceUsd = BASE_PRICE_USD + (SLOPE_USD * tokenBonding.tokensSold());
        uint256 secondBuyPriceUsd = secondNumTokens * currentPriceUsd +
            SLOPE_USD * (secondNumTokens * tokenBonding.tokensSold() + (secondNumTokens * (secondNumTokens - 1)) / 2);
        uint256 secondBuyEthRequired = (secondBuyPriceUsd * 1e18) / (2000e8);
        
        vm.prank(secondBuyer);
        vm.deal(secondBuyer, secondBuyEthRequired * 5);
        tokenBonding.buy{value: secondBuyEthRequired}(secondNumTokens, secondAllocation, secondNonce, signature);

        uint256 transferAmount = secondNumTokens * (10 ** tokenBonding.decimals());
        vm.prank(secondBuyer);
        tokenBonding.transfer(address(3), transferAmount);
        assertEq(tokenBonding.balanceOf(address(3)), transferAmount);
    }

    function testWithdrawRemainingBeforeLiquidity() public {
        // Need to be owner to withdraw
        vm.prank(tokenBonding.owner());
        vm.expectRevert("Liquidity not deployed yet");
        tokenBonding.withdrawRemaining();
    }

    function testWithdrawRemainingNonOwner() public {
        _reachTargetMarketCap();

        // Deploy liquidity
        vm.deal(address(tokenBonding), 1 ether);
        tokenBonding.deployLiquidity();

        vm.prank(address(100));
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", address(100)));
        tokenBonding.withdrawRemaining();
    }

    // Add new factory-specific tests
    function testUpdateProjectLead() public {
        address newProjectLead = address(99);
        factory.updateProjectLead(newProjectLead);
        assertEq(factory.projectLead(), newProjectLead);
    }

    function testUpdateProjectLeadNonOwner() public {
        address newProjectLead = address(99);
        vm.prank(address(100));
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", address(100)));
        factory.updateProjectLead(newProjectLead);
    }

    function testUpdateAgent() public {
        address newAgent = address(99);
        factory.updateAgent(newAgent);
        assertEq(factory.agent(), newAgent);
    }

    function testUpdateAgentNonOwner() public {
        address newAgent = address(99);
        vm.prank(address(100));
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", address(100)));
        factory.updateAgent(newAgent);
    }

    function testDeployContractNonProjectLead() public {
        bytes32 projectId = keccak256("test-project-2");
        vm.prank(address(100));
        vm.expectRevert("Caller is not project lead");
        factory.deployContract(
            projectId,
            "BondingToken2",
            "BOND2",
            address(aggregator),
            address(uniswapRouter)
        );
    }

    function testDeployContractDuplicateId() public {
        bytes32 projectId = keccak256("test-project");
        vm.prank(projectLead);
        vm.expectRevert("Project ID already exists");
        factory.deployContract(
            projectId,
            "BondingToken2",
            "BOND2",
            address(aggregator),
            address(uniswapRouter)
        );
    }

    // Helper function to reach target market cap
    function _reachTargetMarketCap() internal {
        // Buy enough tokens to reach target market cap
        address buyer = address(1);
        uint256 nonce = 1;
        uint256 tokenAllocation = 700_000_000; // 700M tokens
        uint256 numTokens = 700_000_000;  // Buy 700M tokens to reach target
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        // Calculate required ETH (with some buffer)
        uint256 buyPriceUsd = numTokens * BASE_PRICE_USD +
            SLOPE_USD * (numTokens * 0 + (numTokens * (numTokens - 1)) / 2);
        uint256 buyEthRequired = (buyPriceUsd * 1e18) / (2000e8);

        vm.prank(buyer);
        vm.deal(buyer, buyEthRequired * 2);  // Give extra ETH
        tokenBonding.buy{value: buyEthRequired}(numTokens, tokenAllocation, nonce, signature);
    }
} 