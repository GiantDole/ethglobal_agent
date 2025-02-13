"use client";

import { useState, useEffect } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  parseEther,
  http,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { useParams } from "next/navigation";
import { TOKEN_BONDING_ABI } from "../../constants/abis";
import InteractionClient from "@/clients/Interactions";
import { ethers } from "ethers";
import toast from "react-hot-toast";
// import { Wallet } from "ethers";

interface TokenSwapProps {
  tokenTicker: string;
  tokenBondingAddress: `0x${string}`;
}

const interactionClient = new InteractionClient(
  process.env.NEXT_PUBLIC_API_URL,
);

const TokenSwap = ({ tokenTicker, tokenBondingAddress }: TokenSwapProps) => {
  const params = useParams();
  const [inputAmount, setInputAmount] = useState<string>("");
  const [outputAmount, setOutputAmount] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [nonce, setNonce] = useState<number>(0);
  const [signedMessage, setSignedMessage] = useState<string>("");
  const [tokenAllocation, setTokenAllocation] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [ETHPrice, setETHPrice] = useState<number>(0);
  const [tokenPrice, setTokenPrice] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [lastTransaction, setLastTransaction] = useState<string>("");

  //   const agentKey = process.env.NEXT_PUBLIC_AGENT_KEY;
  //   const agentWallet = new Wallet(agentKey!);

  useEffect(() => {
    const readPrices = async () => {
      const ethPrice = await publicClient.readContract({
        address: tokenBondingAddress,
        abi: TOKEN_BONDING_ABI,
        functionName: "getLatestEthPrice",
      });
      setETHPrice(Number(ethPrice));

      const tokenPrice = await publicClient.readContract({
        address: tokenBondingAddress,
        abi: TOKEN_BONDING_ABI,
        functionName: "getCurrentPrice",
      });
      setTokenPrice(Number(tokenPrice));
    };
    readPrices();
  }, []);

  useEffect(() => {
    const fetchSignedMessage = async () => {
      const [account] = await walletClient.getAddresses();
      const res = await interactionClient.getSignature(
        params.id as string,
        account!,
      );
      setSignedMessage(res.signature);
      setTokenAllocation(res.tokenAllocation);
      setNonce(res.nonce);
    };
    fetchSignedMessage();
  }, [lastTransaction]);

  useEffect(() => {
    const calculateOutputAmount = async () => {
      const outputAmount =
        activeTab === "buy"
          ? (Number(inputAmount) * ETHPrice) / tokenPrice
          : (Number(inputAmount) * tokenPrice) / ETHPrice;
      setOutputAmount(outputAmount.toString());
    };
    calculateOutputAmount();
  }, [inputAmount, activeTab]);

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(
      "https://arb-sepolia.g.alchemy.com/v2/Gr5QyfrzTAT0vKoRka3W1fv1RYjDRwQl",
    ),
  });

  const walletClient = createWalletClient({
    chain: arbitrumSepolia,
    transport: custom(window.ethereum!),
  });

  useEffect(() => {
    const fetchBalance = async () => {
      const [account] = await walletClient.getAddresses();
      const balance = await publicClient.getBalance({ address: account! });
      const tokenBalance = await publicClient.readContract({
        address: tokenBondingAddress,
        abi: TOKEN_BONDING_ABI,
        functionName: "balanceOf",
        args: [account!],
      });
      console.log(tokenBalance);
      const balanceAsEther = formatEther(balance);
      const tokenBalanceAsEther = formatEther(tokenBalance as bigint);
      setBalance(Number(balanceAsEther));
      setTokenBalance(Number(tokenBalanceAsEther));
    };
    fetchBalance();
  }, [activeTab, lastTransaction]);

  const handleSwap = async () => {
    console.log("Handle Swap");
    if (!inputAmount && !outputAmount) return;
    if (!tokenAllocation || !nonce || !signedMessage) return;

    setLoading(true);
    try {
      const [account] = await walletClient.getAddresses();

      console.log(tokenBondingAddress);

      const { request } = await publicClient.simulateContract({
        account: account!,
        address: tokenBondingAddress,
        abi: TOKEN_BONDING_ABI,
        functionName: "buy",
        args: [
          BigInt(Math.floor(Number(outputAmount))),
          BigInt(tokenAllocation),
          nonce,
          signedMessage,
        ],
        value: ethers.toBigInt(parseEther(inputAmount)),
      });

      const tx = await walletClient.writeContract(request);
      toast(
        <div className="text-white text-lg">
          Check transaction{" "}
          <a
            className="text-blue-500"
            href={`https://sepolia.arbiscan.io/address/${tx}`}
            target="_blank"
          >
            here
          </a>
          !
        </div>,
      );
      setLastTransaction(tx);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    console.log("Handle Sell");
    if (!inputAmount && !outputAmount) return;
    if (!tokenAllocation || !nonce || !signedMessage) return;

    setLoading(true);
    try {
      const [account] = await walletClient.getAddresses();
      const { request } = await publicClient.simulateContract({
        account: account!,
        address: tokenBondingAddress,
        abi: TOKEN_BONDING_ABI,
        functionName: "sell",
        args: [Number(inputAmount)],
      });

      const tx = await walletClient.writeContract(request);
      toast(
        <div className="text-white text-lg">
          Check transaction{" "}
          <a
            className="text-blue-500"
            href={`https://sepolia.arbiscan.io/address/${tx}`}
            target="_blank"
          >
            here
          </a>
          !
        </div>,
      );
      setLastTransaction(tx);
      setLoading(false);
    } catch (error) {
      console.error("Transaction failed:", error);
      setLoading(false);
    }
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
              Balance: {activeTab === "buy" ? balance : tokenBalance}{" "}
              {activeTab === "buy" ? "ETH" : tokenTicker}
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
              <span className="text-white">
                {activeTab === "buy" ? "ETH" : tokenTicker}
              </span>
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
              disabled
              onChange={(e) => setOutputAmount(e.target.value)}
              className="bg-transparent text-white text-xl w-full focus:outline-none"
            />
            <button className="bg-[#1A1A1A] px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="text-white">
                {activeTab === "buy" ? tokenTicker : "ETH"}
              </span>
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
        onClick={activeTab === "buy" ? handleSwap : handleSell}
        disabled={loading}
        className="w-full bg-[#000000] text-white py-4 rounded-lg font-semibold hover:bg-[#ff7171] transition-colors "
      >
        {loading
          ? "Processing..."
          : `${activeTab === "buy" ? "Buy" : "Sell"} Tokens`}
      </button>
    </div>
  );
};

export default TokenSwap;
