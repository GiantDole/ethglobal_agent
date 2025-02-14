"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { createClient } from "@supabase/supabase-js";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import { Modal } from "@/components/ui";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Add this import at the top
import TokenSwap from "@/components/ui/TokenSwap";

// Images
import World from "@/assets/landing/world.svg";
import About from "@/assets/token_detail/about.svg";
import Tokenomics from "@/assets/token_detail/tokenomics.svg";
import Bonding from "@/assets/token_detail/bonding.svg";
import Buy from "@/assets/token_detail/buy.svg";
import Holder from "@/assets/token_detail/holder.svg";
import Exclusivity from "@/assets/token_detail/exclusivity.svg";
import tokenbuy from "@/assets/token_detail/tokenbuy.svg";
import Copy from "@/assets/token_detail/copy.svg";

// Clients
import ProjectClient from "@/clients/Projects";
import Link from "next/link";
import { toast } from "react-hot-toast";

// Components
// import Protected from "@/components/utils/Protected";

const projectClient = new ProjectClient();

// Hardcoded display data
const DISPLAY_DATA = {
  bondingCurve: "Linear bonding curve with 5% price increase per 1000 tokens",
  holderDistribution: [
    "Early Supporters: 30%",
    "Community Pool: 40%",
    "Team: 20%",
    "Marketing: 10%",
  ],
  tokenomics: [
    "Total Supply: 1,000,000 tokens",
    "Initial Price: 0.001 ETH",
    "Max Supply: 1,000,000 tokens",
    "Vesting Period: 6 months",
  ],
  exclusivity: {
    humans: 150,
    failRate: 75,
    botsFiltered: 1240,
  },
};

function TokenDetail() {
  const params = useParams();
  const { login, authenticated } = usePrivy();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<
    { created_at: string; price: number }[]
  >([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [eligibleAmount, setEligibleAmount] = useState(0);

  // Mock variable for token access - replace with actual implementation later
  const [hasTokenAccess, setHasTokenAccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tokenData = await projectClient.get(params.id as string);
        if (tokenData) {
          // Combine backend data with hardcoded display data
          setData({
            ...tokenData,
            bondingCurve: DISPLAY_DATA.bondingCurve,
            holderDistribution: DISPLAY_DATA.holderDistribution,
            tokenomics: DISPLAY_DATA.tokenomics,
            exclusivity: DISPLAY_DATA.exclusivity,
          });
        }
      } catch (err) {
        setError("Failed to fetch token details");
        console.error("Error fetching token details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  // Add this useEffect for fetching price data
  useEffect(() => {
    const fetchPriceData = async () => {
      const { data, error } = await supabase
        .from("TokenPrices") // replace with your table name
        .select("created_at, price")
        .eq("project_id", params.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching price data:", error);
        return;
      }

      setPriceData(data || []);
    };

    if (params.id) {
      fetchPriceData();
    }
  }, [params.id]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const passed = searchParams.get("passed");
    if (passed && passed === "true") {
      setModalOpen(true);
      setHasTokenAccess(true);
    }
  }, []);

  if (loading)
    return (
      <div className="container mx-auto min-h-[100vh] flex justify-center items-center">
        <h1 className="text-2xl text-[#FF8585] mt-[-96px]">LOADING</h1>
      </div>
    );
  if (error)
    return (
      <div className="container mx-auto min-h-[100vh] flex justify-center items-center">
        <h1 className="text-2xl text-[#FF8585] mt-[-96px]">ERROR</h1>
      </div>
    );
  if (!data)
    return (
      <div className="container mx-auto min-h-[100vh] flex justify-center items-center">
        <h1 className="text-2xl text-[#FF8585] mt-[-96px]">NO DATA</h1>
      </div>
    );

  // Add this chart configuration
  const chartData = {
    labels: priceData
      .filter((d) => d.price !== 0.001)
      .map((d) => {
        const date = new Date(d.created_at);
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }),
    datasets: [
      {
        label: "Token Price",
        data: priceData.filter((d) => d.price !== 0.001).map((d) => d.price),
        borderColor: "#FF8585",
        backgroundColor: "rgba(255, 133, 133, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Token Price History",
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return (
    <main>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="my-6 px-4">
          <h1 className="mb-4 text-center font-bold text-2xl">
            Congrats &#127881;
          </h1>
          <p>
            The bouncer has allocated {eligibleAmount} {data.name} tokens.
          </p>
        </div>
      </Modal>
      <div className="mb-16">
        <div className="container mx-auto">
          <div className="my-10">
            <div className="h-[420px] w-[100%]">
              {priceData.length > 0 ? (
                <Line
                  data={chartData}
                  options={chartOptions}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  Loading price data...
                </div>
              )}
            </div>
          </div>
          <div className="container mx-auto flex items-center gap-6 mt-12 p-4 md:p-0">
            <div className="relative flex items-center justify-center border border-[#FF8585] rounded-full overflow-hidden">
              <Image
                src={data.image_url}
                alt={data.name}
                width={106}
                height={106}
              />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold">
              {data.name} - ${data.token_ticker}
            </h1>
            <Image src={World} alt="World" />
          </div>
          <div
            className="container mx-auto"
            onClick={() => {
              navigator.clipboard.writeText(data.token_address);
              toast.success("Copied to clipboard");
            }}
          >
            <div className="my-8 py-2 px-3 bg-[#D9D9D9] rounded-md inline-block min-w-[240px] hover:cursor-pointer mx-4 md:mx-0">
              <div className="flex items-center justify-between">
                <p className="text-black tracking-[2px] text-center">{`${data.token_address.slice(
                  0,
                  8,
                )}...${data.token_address.slice(-6)}`}</p>
                <Image src={Copy} alt="Copy" />
              </div>
            </div>
          </div>
          <div className="container mx-auto flex gap-12 flex-col p-4 md:flex-row">
            <div className="flex-1 flex flex-col gap-8">
              <div>
                <Image src={About} alt="About" className="mb-4" />
                <p className="text-base">{data.long_description}</p>
              </div>
              <div>
                <Image src={Tokenomics} alt="Tokenomics" className="mb-4" />
                <ul className="list-disc ml-5">
                  {data.tokenomics.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <Image src={Bonding} alt="Bonding" className="mb-4" />
                <div className="w-full bg-[#424242] h-2 mt-4 mb-6">
                  <div
                    className="bg-[#FF8585] h-2 transition-all duration-300"
                    style={{ width: `${data.bondingCurveProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="font-medium">
                    Current Progress: {data.bondingCurveProgress}%
                  </p>
                  <p>{data.bondingCurve}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-8">
              <div>
                <Image src={Buy} alt="Buy" className="mb-4" />
                <div className="w-full p-6 bg-[#FF8585] rounded-lg">
                  {!hasTokenAccess && (
                    <div className="flex justify-center items-center">
                      <Image
                        src={tokenbuy}
                        alt="Buy"
                        className="mb-4 text-center"
                      />
                    </div>
                  )}
                  {!authenticated ? (
                    <button
                      onClick={login}
                      className="w-full py-3 px-4 bg-[#000000] text-[#FF8585] rounded-lg hover:bg-opacity-90"
                    >
                      Login to Access Token
                    </button>
                  ) : !hasTokenAccess ? (
                    <Link href={`/token/${data.id}/bouncer`}>
                      <button className="w-full py-3 px-4 bg-[#000000] text-[#FF8585] rounded-lg hover:bg-opacity-90">
                        Pass the Bouncer
                      </button>
                    </Link>
                  ) : (
                    <TokenSwap
                      tokenTicker={data.token_ticker}
                      tokenBondingAddress={data.token_address}
                      setEligibleAmount={setEligibleAmount}
                    />
                  )}
                </div>
              </div>
              <div>
                {/* <Image src={Dyor} alt="Dyor" className="mb-4" /> */}
              </div>
              <div>
                <Image src={Holder} alt="Holder" className="mb-4" />
                <div className="flex items-center justify-between mb-4">
                  <p>Holder</p>
                  <p>Percentage</p>
                </div>
                <ul className="list-disc ml-5">
                  {data.holderDistribution.map(
                    (item: string, index: number) => {
                      const [holder, percentage] = item.split(": ");
                      return (
                        <li key={index}>
                          <div className="flex items-center justify-between">
                            <p>{holder}</p>
                            <p>{percentage}</p>
                          </div>
                        </li>
                      );
                    },
                  )}
                </ul>
              </div>
              <div>
                <Image src={Exclusivity} alt="Exclusivity" className="mb-4" />
                <div>
                  <p>{data.exclusivity.humans} humans got in</p>
                  <p>{data.exclusivity.failRate}% of applicants fail to pass</p>
                  <p>{data.exclusivity.botsFiltered} bots filtered out</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default TokenDetail;
