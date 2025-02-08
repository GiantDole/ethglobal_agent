"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProjectClient from "@/clients/Projects";

// Components
import Protected from "@/components/utils/Protected";

const projectClient = new ProjectClient(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

// Hardcoded display data
const DISPLAY_DATA = {
  bondingCurve: "Linear bonding curve with 5% price increase per 1000 tokens",
  holderDistribution: [
    "Early Supporters: 30%",
    "Community Pool: 40%",
    "Team: 20%",
    "Marketing: 10%"
  ],
  tokenomics: [
    "Total Supply: 1,000,000 tokens",
    "Initial Price: 0.001 ETH",
    "Max Supply: 1,000,000 tokens",
    "Vesting Period: 6 months"
  ],
  exclusivity: {
    humans: 150,
    failRate: 75,
    botsFiltered: 1240
  }
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
            progress: 20 // Hardcoded progress for bonding curve
          });
        }
      } catch (err) {
        setError('Failed to fetch token details');
        console.error('Error fetching token details:', err);
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

          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <h1 className="text-3xl font-bold my-6">{data.name} - ${data.token_ticker}</h1>
              <p>Contract: {data.token_address}</p>

              <div className="mt-8">
                <h2 className="text-2xl font-bold">About</h2>
                <p>{data.long_description}</p>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-bold">Bonding Curve Progress</h2>
                <div className="w-full bg-gray-200 rounded-full h-4 mt-4 mb-6">
                  <div 
                    className="bg-black h-4 rounded-full transition-all duration-300" 
                    style={{ width: `${data.progress}%` }}
                  >
                  </div>
                </div>
                <p>{data.bondingCurve}</p>
              </div>
            </div>

            <div>
              <div className="mt-8">
                <h2 className="text-2xl font-bold">Tokenomics</h2>
                <ul className="list-disc ml-5">
                  {data.tokenomics.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-bold">Holder Distribution</h2>
                <div className="grid grid-cols-2 font-bold mb-2">
                  <span>Holder</span>
                  <span className="text-right">Percentage</span>
                </div>
                <ul className="list-none">
                  {data.holderDistribution.map((item: string, index: number) => {
                    const [holder, percentage] = item.split(': ');
                    return (
                      <li key={index} className="grid grid-cols-2">
                        <span>{holder}</span>
                        <span className="text-right">{percentage}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-bold">Exclusivity</h2>
                <p>{data.exclusivity.humans} humans got in</p>
                <p>{data.exclusivity.failRate}% of applicants fail to pass</p>
                <p>{data.exclusivity.botsFiltered} bots filtered out</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Protected>
  );
}

export default TokenDetail;
