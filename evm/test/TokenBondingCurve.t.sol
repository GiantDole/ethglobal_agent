// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/TokenBondingCurve.sol";

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
}

//=============================================================================
// MockUniswapRouter
//=============================================================================
contract MockUniswapRouter is IUniswapV2Router02 {
    // Variables to store the last parameters for verification.
    uint256 public lastTokenAmount;
    uint256 public lastEthAmount;
    uint256 public liquidity;
    address public caller;

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
        lastTokenAmount = amountTokenDesired;
        lastEthAmount = msg.value;
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
    MockAggregator aggregator;
    MockUniswapRouter uniswapRouter;

    // Bonding curve parameters.
    uint256 basePriceUsd = 100e8; // $100 with 8 decimals.
    uint256 slopeUsd = 1e8;       // $1 increment per token sold.
    uint256 totalSupplyTokens = 1000; // Total of 1000 tokens.
    // Set target market cap low enough to trigger liquidity after minimal sales.
    uint256 targetMarketCapUsd = 1e10; 

    address owner = address(this);
    address agent;
    uint256 agentPrivateKey = 0xBEEF; // Arbitrary private key for agent.

    function setUp() public {
        // Set agent address via cheatcode.
        agent = vm.addr(agentPrivateKey);

        // Deploy a mock aggregator. For example, simulate a constant ETH price of $2000:
        // Since Chainlink returns price with 8 decimals, we set price = 2000e8.
        aggregator = new MockAggregator(2000e8);

        // Deploy the bonding curve contract.
        tokenBonding = new TokenBondingCurve(
            "BondingToken",
            "BOND",
            totalSupplyTokens,
            basePriceUsd,
            slopeUsd,
            agent,
            address(aggregator),
            targetMarketCapUsd
        );

        // Deploy and set the mock Uniswap router.
        uniswapRouter = new MockUniswapRouter();
        tokenBonding.setUniswapRouter(address(uniswapRouter));
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
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agentPrivateKey, messageHash);
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
        uint256 tokenAllocation = 5; // Allocation is only 5 tokens.
        uint256 numTokensToBuy = 10; // Trying to buy 10.
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        vm.prank(buyer);
        vm.deal(buyer, 10 ether);
        vm.expectRevert("Cannot buy more than allocation");
        vm.prank(buyer);
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

        vm.prank(buyer);
        vm.deal(buyer, 10 ether);
        tokenBonding.buy{value: 2 ether}(buyTokens, tokenAllocation, nonce, signature);

        uint256 buyerTokenBalanceBefore = tokenBonding.balanceOf(buyer);
        uint256 contractEthBefore = address(tokenBonding).balance;

        // Sell 5 tokens.
        uint256 sellTokens = 5;
        vm.prank(buyer);
        tokenBonding.sell(sellTokens);

        uint256 expectedRemaining = buyerTokenBalanceBefore - sellTokens * (10 ** tokenBonding.decimals());
        assertEq(tokenBonding.balanceOf(buyer), expectedRemaining);
        assertEq(tokenBonding.tokensSold(), buyTokens - sellTokens);
        // Check that contract ETH increased (refund received by seller).
        assertGt(address(tokenBonding).balance, contractEthBefore);
    }

    //--------------------------------------------------------------------------
    // Test: Selling without owning tokens should revert.
    //--------------------------------------------------------------------------
    function testSellInsufficientBalance() public {
        address seller = address(3);
        vm.prank(seller);
        vm.deal(seller, 10 ether);
        vm.expectRevert("Insufficient token balance");
        vm.prank(seller);
        tokenBonding.sell(1);
    }

    //--------------------------------------------------------------------------
    // Test: deployLiquidity when there are sufficient unsold tokens.
    //
    // Scenario: A buy occurs so tokensSold > 0. Then ETH is added
    // and liquidity is deployed.
    //--------------------------------------------------------------------------
    function testDeployLiquiditySufficientTokens() public {
        // Simulate a buy so that tokensSold becomes 10.
        address buyer = address(4);
        uint256 nonce = 1;
        uint256 tokenAllocation = 50;
        uint256 buyTokens = 10;
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        vm.prank(buyer);
        vm.deal(buyer, 10 ether);
        tokenBonding.buy{value: 3 ether}(buyTokens, tokenAllocation, nonce, signature);
        // Now currentPriceUsd = basePriceUsd + slopeUsd * tokensSold = 100e8 + 10e8 = 110e8.

        // Supply ETH for liquidity.
        vm.deal(address(tokenBonding), 1 ether);

        // Deploy liquidity.
        tokenBonding.deployLiquidity();
        assertTrue(tokenBonding.liquidityDeployed());

        // Calculation in deployLiquidity:
        // ethAvailable = 1 ether; usdAvailable = (1e18 * 2000e8) / 1e18 = 2000e8.
        // idealTokenWhole = 2000e8 / 110e8 = 18 (integer division)
        // Unsold tokens = totalSupply - 10 = 990 tokens >> 18.
        // Thus, tokensToDeployWhole should be 18 and usedEth equals 1 ether.
        assertEq(uniswapRouter.lastTokenAmount, 18 * (10 ** tokenBonding.decimals()));
        assertEq(uniswapRouter.lastEthAmount, 1 ether);
    }

    //--------------------------------------------------------------------------
    // Test: deployLiquidity when available unsold tokens are insufficient.
    //
    // Scenario: Nearly all tokens are sold so that unsold tokens are few.
    //--------------------------------------------------------------------------
    function testDeployLiquidityInsufficientTokens() public {
        // Simulate a buy where almost all tokens are sold.
        address buyer = address(5);
        uint256 nonce = 1;
        uint256 tokenAllocation = 50;
        uint256 buyTokens = 990;  // tokensSold becomes 990.
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        vm.prank(buyer);
        vm.deal(buyer, 100 ether);
        tokenBonding.buy{value: 50 ether}(buyTokens, tokenAllocation, nonce, signature);
        // Unsold tokens = totalSupply - tokensSold = 1000 - 990 = 10 tokens.
        // currentPriceUsd = basePriceUsd + slopeUsd * tokensSold = 100e8 + 990e8 = 1090e8.
        // Supply ETH for liquidity.
        vm.deal(address(tokenBonding), 10 ether);

        tokenBonding.deployLiquidity();
        assertTrue(tokenBonding.liquidityDeployed());

        // In this scenario, tokensToDeployWhole is the unsold token balance (10 tokens).
        // usedEth = (10 * 1090e8 * 1e18) / (2000e8)
        uint256 requiredUsd = 10 * 1090e8;
        uint256 expectedUsedEth = (requiredUsd * 1e18) / (2000e8);

        assertEq(uniswapRouter.lastTokenAmount, 10 * (10 ** tokenBonding.decimals()));
        assertEq(uniswapRouter.lastEthAmount, expectedUsedEth);
    }

    //--------------------------------------------------------------------------
    // Test: After liquidity is deployed, the owner can withdraw remaining ETH and tokens.
    //--------------------------------------------------------------------------
    function testWithdrawRemaining() public {
        address buyer = address(6);
        uint256 nonce = 1;
        uint256 tokenAllocation = 50;
        uint256 buyTokens = 10;
        bytes memory signature = _getSignature(buyer, nonce, tokenAllocation);

        // Execute a buy.
        vm.prank(buyer);
        vm.deal(buyer, 10 ether);
        tokenBonding.buy{value: 3 ether}(buyTokens, tokenAllocation, nonce, signature);
        // Add extra ETH.
        vm.deal(address(tokenBonding), 1 ether);

        // Deploy liquidity.
        tokenBonding.deployLiquidity();

        uint256 ownerEthBefore = owner.balance;
        uint256 remainingTokens = tokenBonding.balanceOf(address(tokenBonding));

        tokenBonding.withdrawRemaining();

        // The contract should have no ETH.
        assertEq(address(tokenBonding).balance, 0);
        // The remaining tokens should have been transferred to owner.
        assertEq(tokenBonding.balanceOf(owner), remainingTokens);
    }

    //--------------------------------------------------------------------------
    // Test: updateAgent by owner works.
    //--------------------------------------------------------------------------
    function testUpdateAgent() public {
        address newAgent = address(99);
        tokenBonding.updateAgent(newAgent);
        assertEq(tokenBonding.agent(), newAgent);
    }

    //--------------------------------------------------------------------------
    // Test: updateAgent by a non-owner reverts.
    //--------------------------------------------------------------------------
    function testUpdateAgentNonOwner() public {
        address newAgent = address(99);
        vm.prank(address(100));
        vm.expectRevert();
        tokenBonding.updateAgent(newAgent);
    }
} 