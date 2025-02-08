// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {TokenBondingCurveFactory} from "../src/TokenBondingCurveFactory.sol";
import {TokenBondingCurve} from "../src/TokenBondingCurve.sol";

contract DeployTokenBondingCurve is Script {
    // Token parameters
    string constant TOKEN_NAME = "DoggoByte";
    string constant TOKEN_SYMBOL = "DGB";
    
    // Bonding curve parameters
    uint256 constant TOTAL_SUPPLY_TOKENS = 1_000_000;    // 1M tokens total
    uint256 constant BASE_PRICE_USD = 0.00106e8;         // $0.00106 initial price
    uint256 constant SLOPE_USD = 0.0000158e8;            // $0.0000158 price increase per token
    uint256 constant TARGET_MARKET_CAP_USD = 6360e8;     // $6,360 target market cap
    
    // Project identifier
    string constant PROJECT_NAME = "DoggoByte"; // Used to generate project ID

    // Network-specific addresses
    address constant CHAINLINK_PRICE_FEED = 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165; // Arbitrum Sepolia ETH/USD
    address constant UNISWAP_ROUTER = 0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008; // Arbitrum Sepolia UniswapV2Router02

    // Default anvil private key (only used if PRIVATE_KEY env var is not set)
    uint256 constant DEFAULT_ANVIL_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function setUp() public {}

    function run() public {
        // Use the default anvil account if no private key is provided
        uint256 deployerPrivateKey;
        string memory privateKey = vm.envOr("PRIVATE_KEY", string(""));
        if (bytes(privateKey).length > 0) {
            deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        } else {
            deployerPrivateKey = DEFAULT_ANVIL_KEY;
        }

        // Get factory address from environment
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Get factory instance
        TokenBondingCurveFactory factory = TokenBondingCurveFactory(factoryAddress);

        // Generate project ID using project name and timestamp
        bytes32 projectId = keccak256(abi.encodePacked(PROJECT_NAME, block.timestamp));
        
        // Deploy new token through factory with configurable parameters
        address tokenAddress = factory.deployContract(
            projectId,
            TOKEN_NAME,
            TOKEN_SYMBOL,
            TOTAL_SUPPLY_TOKENS,
            BASE_PRICE_USD,
            SLOPE_USD,
            TARGET_MARKET_CAP_USD,
            CHAINLINK_PRICE_FEED,
            UNISWAP_ROUTER
        );

        vm.stopBroadcast();

        // Log deployment information
        console.log("New Token Bonding Curve deployed at:", tokenAddress);
        console.log("Project ID:", vm.toString(projectId));
        console.log("Deployed by:", vm.addr(deployerPrivateKey));
    }
}