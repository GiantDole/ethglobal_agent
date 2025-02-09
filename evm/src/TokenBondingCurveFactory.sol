// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TokenBondingCurve.sol";

contract TokenBondingCurveFactory is Ownable {
    // Roles
    address public projectLead;
    address public agent;
    
    // Mapping from project ID to deployed contract
    mapping(bytes32 => address) public deployedContracts;
    
    // Events
    event ContractDeployed(bytes32 indexed projectId, address contractAddress);
    event ProjectLeadUpdated(address indexed oldLead, address indexed newLead);
    event AgentUpdated(address indexed oldAgent, address indexed newAgent);
    
    constructor(address initialProjectLead, address initialAgent) Ownable(msg.sender) {
        projectLead = initialProjectLead;
        agent = initialAgent;
    }
    
    modifier onlyProjectLead() {
        require(msg.sender == projectLead, "Caller is not project lead");
        _;
    }
    
    function deployContract(
        bytes32 projectId,
        string memory name,
        string memory symbol,
        uint256 totalSupplyTokens,
        uint256 basePriceUsd,
        uint256 slopeUsd,
        uint256 targetMarketCapUsd,
        address priceFeed,
        address uniswapRouter
    ) external onlyProjectLead returns (address) {
        require(deployedContracts[projectId] == address(0), "Project ID already exists");
        
        // Deploy new contract with configurable parameters
        TokenBondingCurve newContract = new TokenBondingCurve(
            name,
            symbol,
            totalSupplyTokens,
            basePriceUsd,
            slopeUsd,
            address(this),
            priceFeed,
            targetMarketCapUsd
        );
        
        // Set Uniswap router
        newContract.setUniswapRouter(uniswapRouter);
        
        // Store deployment
        deployedContracts[projectId] = address(newContract);
        
        emit ContractDeployed(projectId, address(newContract));
        return address(newContract);
    }
    
    function updateProjectLead(address newProjectLead) external onlyOwner {
        require(newProjectLead != address(0), "Invalid address");
        address oldLead = projectLead;
        projectLead = newProjectLead;
        emit ProjectLeadUpdated(oldLead, newProjectLead);
    }
    
    function updateAgent(address newAgent) external onlyOwner {
        require(newAgent != address(0), "Invalid address");
        address oldAgent = agent;
        agent = newAgent;
        emit AgentUpdated(oldAgent, newAgent);
    }
    
    function getAgent() external view returns (address) {
        return agent;
    }
}