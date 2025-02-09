import { ethers } from "ethers";

const abi = [
    "function tokensSold() view returns (uint256)",
    "function basePriceUsd() view returns (uint256)",
    "function slopeUsd() view returns (uint256)",
    "function targetMarketCapUsd() view returns (uint256)"
];

class EVMService {
    private provider: ethers.JsonRpcProvider;

    constructor() {
        if (!process.env.RPC_URL) {
            throw new Error('RPC_URL environment variable is not set');
        }
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    }

    /**
     * Calculates the percentage progress towards maturity for a bonding curve
     * @param bondingCurveAddress The address of the TokenBondingCurve contract
     * @returns Progress as a percentage between 0-100
     */
    async getBondingCurveProgress(bondingCurveAddress: string): Promise<number> {
        try {
            const contract = new ethers.Contract(bondingCurveAddress, abi, this.provider);

            // Fetch all required values from the contract
            const [tokensSold, basePriceUsd, slopeUsd, targetMarketCapUsd] = await Promise.all([
                contract.tokensSold(),
                contract.basePriceUsd(),
                contract.slopeUsd(),
                contract.targetMarketCapUsd()
            ]);

            // Calculate current market cap using BigInt
            const currentPriceUsd = BigInt(basePriceUsd) + (BigInt(slopeUsd) * BigInt(tokensSold));
            const currentMarketCapUsd = BigInt(tokensSold) * currentPriceUsd;
            // Convert to number after calculation
            const progress = Number((currentMarketCapUsd * BigInt(100)) / BigInt(targetMarketCapUsd));
            
            // Cap the progress at 100%
            return Math.min(progress, 100);

        } catch (error) {
            console.error('Error calculating bonding curve progress:', error);
            throw new Error('Failed to calculate bonding curve progress');
        }
    }
}

export default new EVMService();
