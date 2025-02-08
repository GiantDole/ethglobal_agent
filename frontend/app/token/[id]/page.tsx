"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// Images
import Connect from "@/assets/header/connect_icon.svg";
import Logo from "@/assets/header/logo.svg";
import Net from "@/assets/token_detail/net.svg";
import Bouncer from "@/assets/token_detail/logo.png";
import Frame from "@/assets/landing/frame.png";
import World from "@/assets/landing/world.svg";
import About from "@/assets/token_detail/about.svg";
import Tokenomics from "@/assets/token_detail/tokenomics.svg";
import Bonding from "@/assets/token_detail/bonding.svg";
import Stats from "@/assets/token_detail/stats.svg";
import Buy from "@/assets/token_detail/buy.svg";
import Dyor from "@/assets/token_detail/dyor.svg";
import Holder from "@/assets/token_detail/holder.svg";
import Exclusivity from "@/assets/token_detail/exclusivity.svg";

// Clients
import ProjectClient from "@/clients/Projects";

// Components
// import Protected from "@/components/utils/Protected";

const projectClient = new ProjectClient(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
);

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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            progress: 20, // Hardcoded progress for bonding curve
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div>No data found</div>;

  return (
    <Protected>
      <main>
        <div className="container mx-auto py-12">
          <Link href="/" className="text-blue-500">
            Back
          </Link>
          
          {/* Add Bouncer Link */}
          <Link href={`/token/${params.id}/bouncer`} className="ml-4 text-blue-500">
            Go to Bouncer
          </Link>

          {/* Image Banner */}
          <div className="mt-8">
            <img
              src={data.banner_image || "/images/avatar.png"}
              alt="Banner"
              className="w-full"
              style={{ height: '300px', objectFit: 'cover' }}
            />
          </div>
          <div className="flex items-center gap-6 mt-12">
            <div className="relative flex items-center justify-center">
              <Image
                src={"/images/avatar.png"}
                alt={data.name}
                width={168}
                height={168}
                className="absolute clip ml-[-6px] mt-[1px]"
              />
              <Image src={Frame} alt="Frame" className="relative" />
            </div>
            <h1 className="text-6xl font-bold">
              {data.name} - ${data.token_ticker}
            </h1>
            <Image src={World} alt="World" />
          </div>
          <div className="my-8 py-2 px-3 bg-[#D9D9D9] rounded-md inline-block min-w-[240px] hover:cursor-pointer">
            <p className="text-black tracking-[2px] text-center">{`${data.token_address.slice(
              0,
              8,
            )}...${data.token_address.slice(-6)}`}</p>
          </div>
          <div className="flex gap-6">
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
                    style={{ width: `${data.progress}%` }}
                  ></div>
                </div>
                <p>{data.bondingCurve}</p>
              </div>
              <div>
                {/* <Image src={Stats} alt="Stats" className="mb-4" /> */}
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-8">
              <div>
                <Link href={`/token/${data.id}/bouncer`}>
                  <Image src={Buy} alt="Buy" className="mb-4" />
                </Link>
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
