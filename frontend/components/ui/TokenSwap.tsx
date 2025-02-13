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
import toast from "react-hot-toast";

interface TokenSwapProps {
  tokenTicker: string;
  tokenBondingAddress: `0x${string}`;
  setEligibleAmount: (amount: number) => void;
}

const interactionClient = new InteractionClient();

const TokenSwap = ({
  tokenTicker,
  tokenBondingAddress,
  setEligibleAmount,
}: TokenSwapProps) => {
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
      if (!account) {
        return;
      }
      const res = await interactionClient.getSignature(
        params.id as string,
        account!,
      );
      setSignedMessage(res.signature);
      setTokenAllocation(res.tokenAllocation);
      setEligibleAmount(res.tokenAllocation);
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
      if (!account) {
        return;
      }
      const balance = await publicClient.getBalance({ address: account! });
      const tokenBalance = await publicClient.readContract({
        address: tokenBondingAddress,
        abi: TOKEN_BONDING_ABI,
        functionName: "balanceOf",
        args: [account!],
      });
      const balanceAsEther = formatEther(balance);
      const tokenBalanceAsEther = formatEther(tokenBalance as bigint);
      setBalance(Number(balanceAsEther));
      setTokenBalance(Number(tokenBalanceAsEther));
    };
    fetchBalance();
  }, [activeTab, lastTransaction, walletClient.chain]);

  const handleSwap = async () => {
    if (!inputAmount && !outputAmount) return;
    if (tokenAllocation === undefined || nonce === undefined || !signedMessage)
      return;
    if (tokenAllocation === 0) {
      toast.error("Your token allocation is 0");
      return;
    }
    setLoading(true);
    try {
      await walletClient.switchChain({
        id: arbitrumSepolia.id,
      });

      const [account] = await walletClient.getAddresses();
      if (!account) {
        toast.error("Please connect your wallet");
        return;
      }
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
        value: BigInt(parseEther(inputAmount) + parseEther("0.0001")),
      });

      const tx = await walletClient.writeContract(request);
      toast(
        <div className="text-white text-lg">
          Check transaction{" "}
          <a
            className="text-blue-500"
            href={`https://sepolia.arbiscan.io/tx/${tx}`}
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
    if (!inputAmount && !outputAmount) return;
    if (tokenAllocation === undefined || nonce === undefined || !signedMessage)
      return;
    if (tokenAllocation === 0) {
      toast.error("Your token allocation is 0");
      return;
    }

    setLoading(true);
    try {
      await walletClient.switchChain({
        id: arbitrumSepolia.id,
      });
      const [account] = await walletClient.getAddresses();
      if (!account) {
        toast.error("Please connect your wallet");
        return;
      }
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
            href={`https://sepolia.arbiscan.io/tx/${tx}`}
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

  const handleDisabled = async () => {
    if (loading) return true;

    if (walletClient.chain.id !== arbitrumSepolia.id) {
      toast.error("Please switch to Arbitrum Sepolia network.");
      return walletClient
        .switchChain({
          id: arbitrumSepolia.id,
        })
        .then(() => {
          return false;
        })
        .catch(() => {
          return true;
        });
    }

    if (tokenAllocation === undefined || nonce === undefined || !signedMessage)
      return true;

    if (tokenAllocation === 0) {
      toast.error("Your token allocation is 0");
      return true;
    }

    if (Number(outputAmount) > tokenAllocation - tokenBalance) {
      toast.error(
        `You can buy maximum ${tokenAllocation - tokenBalance} ${tokenTicker}`,
      );
      return true;
    }
    if (activeTab === "buy" && Number(inputAmount) > balance) {
      toast.error("You don't have enough balance");
      return true;
    }
    if (activeTab === "sell" && Number(inputAmount) > tokenBalance) {
      toast.error(`You don't have enough ${tokenTicker}`);
      return true;
    }
    if (activeTab === "buy" && Number(inputAmount) <= 0) {
      toast.error("Input amount must be greater than 0");
      return true;
    }
    if (activeTab === "sell" && Number(inputAmount) <= 0) {
      toast.error("Input amount must be greater than 0");
      return true;
    }
    if (activeTab === "buy" && Number(outputAmount) > tokenAllocation) {
      toast.error(`Your token allocation is: ${tokenAllocation}`);
      return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => {
            setInputAmount("");
            setActiveTab("buy");
          }}
          className={`flex-1 py-2 rounded-lg font-semibold ${
            activeTab === "buy"
              ? "bg-[#000000] text-white"
              : "bg-[#FFFFFF] text-black"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => {
            setInputAmount("");
            setActiveTab("sell");
          }}
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
        <div>
          <p className="text-black text-sm font-semibold mt-[-12px]">
            Your token allocation from bouncer:{" "}
            {tokenAllocation ? tokenAllocation : 0}{" "}
            {tokenAllocation ? tokenTicker : ""}
          </p>
        </div>
        {/* Input Token */}
        <div className="bg-black p-4 rounded-lg">
          <div className="flex justify-between mb-2">
            <span className="text-white">From</span>
            <span className="text-white">
              Balance:{" "}
              {activeTab === "buy"
                ? balance.toFixed(6).replace(/\.?0+$/, "")
                : tokenBalance.toFixed(6).replace(/\.?0+$/, "")}{" "}
              {activeTab === "buy" ? "ETH" : tokenTicker}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="any"
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
              Balance:{" "}
              {activeTab === "buy"
                ? tokenBalance.toFixed(6).replace(/\.?0+$/, "")
                : balance.toFixed(6).replace(/\.?0+$/, "")}{" "}
              {activeTab === "buy" ? tokenTicker : "ETH"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="0.0"
              value={
                inputAmount
                  ? parseFloat(outputAmount)
                      .toFixed(6)
                      .replace(/\.?0+$/, "") // Ondalık kısımdaki gereksiz sıfırları kaldırır
                  : ""
              }
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
        onClick={async () => {
          if (await handleDisabled()) return;
          activeTab === "buy" ? handleSwap() : handleSell();
        }}
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
