// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {TokenBondingCurveFactory} from "../src/TokenBondingCurveFactory.sol";

contract DeployFactory is Script {
    function setUp() public {}

    function run() public returns (TokenBondingCurveFactory) {
        // Use the default anvil account if no private key is provided
        uint256 deployerPrivateKey;
        string memory privateKey = vm.envOr("PRIVATE_KEY", string(""));
        if (bytes(privateKey).length > 0) {
            deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        } else {
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80; // Default anvil account
        }
        
        // Get deployment parameters with default values
        address projectLead = vm.envOr("PROJECT_LEAD", address(1)); // Default to address(1) if not set
        address agent = vm.envOr("AGENT", address(2)); // Default to address(2) if not set

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the factory
        TokenBondingCurveFactory factory = new TokenBondingCurveFactory(
            projectLead,
            agent
        );

        vm.stopBroadcast();

        // Log the deployment address
        console.log("Factory deployed to:", address(factory));
        console.log("Deployed by:", vm.addr(deployerPrivateKey));

        return factory;
    }
}