"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { TOKEN_BONDING_ABI } from "../../constants/abis";
// import { Wallet } from "ethers";

interface TokenSwapProps {
  tokenTicker: string;
  tokenBondingAddress: string;
}

const TokenSwap = ({ tokenTicker, tokenBondingAddress }: TokenSwapProps) => {
  const [inputAmount, setInputAmount] = useState<string>("");
  const [outputAmount, setOutputAmount] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [loading, setLoading] = useState(false);

  // Add new state for contract interaction
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

//   const agentKey = process.env.NEXT_PUBLIC_AGENT_KEY;
//   const agentWallet = new Wallet(agentKey!);

  useEffect(() => {
    const initializeContract = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = await provider.getSigner();
        setSigner(signer);
        
        // Initialize contract
        const contract = new ethers.Contract(
          tokenBondingAddress,
          TOKEN_BONDING_ABI,
          signer
        );
        setContract(contract);
      }
    };

    initializeContract();
  }, []);

  const handleSwap = async () => {
    if (!contract || !signer || !inputAmount || !outputAmount) return;
    
    setLoading(true);
    // try {
    //   if (activeTab === "buy") {
    //     // Convert ETH input to Wei
    //     const depositEth = ethers.parseEther(inputAmount);
    //     const tokensToReceive = Math.floor(Number(outputAmount));
        
    //     // Get and increment nonce
    //     const currentNonce = await contract.nonces(await signer.getAddress());
    //     const newNonce = currentNonce + 1n;
        
    //     // Get signature from backend API
    //     const encodedMessage = AbiCoder.defaultAbiCoder().encode(
    //       ["address", "uint256", "address", "uint256"],
    //       [signer.address, newNonce, contract.target, tokensToReceive]
    //     );
    //     const messageHash = keccak256(encodedMessage);
    //     const signature = await agentWallet.signMessage(getBytes(messageHash));
        
    //     // Execute buy transaction
    //     const tx = await contract.buy(tokensToReceive, tokensToReceive, newNonce, signature, {
    //       value: depositEth
    //     });
    //     await tx.wait();
    //   } else {
    //     // Sell logic
    //     const tokensToSell = Math.floor(Number(inputAmount));
    //     const minEthToReceive = ethers.parseEther(outputAmount);
    //     const tx = await contract.sell(tokensToSell, minEthToReceive);
    //     await tx.wait();
    //   }
    // } catch (error) {
    //   console.error("Transaction failed:", error);
    // } finally {
    //   setLoading(false);
    // }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setActiveTab("buy")}
          className={`flex-1 py-2 rounded-lg font-semibold ${
            activeTab === "buy"
              ? "bg-[#000000] text-white"
              : "bg-[#FFFFFF] text-black"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setActiveTab("sell")}
          className={`flex-1 py-2 rounded-lg font-semibold ${
            activeTab === "sell"
              ? "bg-[#000000] text-white"
              : "bg-[#FFFFFF] text-black"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Token Swap Interface */}
      <div className="flex flex-col gap-3">
        {/* Input Token */}
        <div className="bg-black p-4 rounded-lg">
          <div className="flex justify-between mb-2">
            <span className="text-white">From</span>
            <span className="text-white">
              Balance: 0.0 {activeTab === "buy" ? "ETH" : tokenTicker}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="number" 
              placeholder="0.0"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              className="bg-transparent text-white text-xl w-full focus:outline-none"
            />
            <button className="bg-[#1A1A1A] px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="text-white">{activeTab === "buy" ? "ETH" : tokenTicker}</span>
            </button>
          </div>
        </div>

        {/* Output Token */}
        <div className="bg-black p-4 rounded-lg">
          <div className="flex justify-between mb-2">
            <span className="text-white">To</span>
            <span className="text-white">
              Balance: 0.0 {activeTab === "buy" ? tokenTicker : "ETH"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="number" 
              placeholder="0.0"
              value={outputAmount}
              onChange={(e) => setOutputAmount(e.target.value)}
              className="bg-transparent text-white text-xl w-full focus:outline-none"
            />
            <button className="bg-[#1A1A1A] px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="text-white">{activeTab === "buy" ? tokenTicker : "ETH"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Price Impact and Slippage */}
      <div className="bg-black p-4 rounded-lg">
        <div className="flex justify-between text-sm text-white">
          <span>Price Impact</span>
          <span>~0.05%</span>
        </div>
        <div className="flex justify-between text-sm text-white mt-2">
          <span>Max Slippage</span>
          <span>0.5%</span>
        </div>
      </div>

      {/* Swap Button */}
      <button 
        onClick={handleSwap}
        disabled={loading || !inputAmount || !outputAmount}
        className="w-full bg-[#000000] text-white py-4 rounded-lg font-semibold hover:bg-[#ff7171] transition-colors "
      >
        {loading ? "Processing..." : `${activeTab === "buy" ? "Buy" : "Sell"} Tokens`}
      </button>
    </div>
  );
};

export default TokenSwap; 