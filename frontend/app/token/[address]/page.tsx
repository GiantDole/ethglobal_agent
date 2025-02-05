"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Components
import Protected from "@/components/utils/Protected";

// Mock data function
const fetchTokenData = () => {
  return Promise.resolve({
    address: "TAp4f5i5Ct4XMhDiJzGGjBUA1UoWFKZtXs",
    name: "DoggoByte",
    symbol: "DGB",
    bannerImage: "/images/avatar.png",
    about: `DoggoByte ($DGB) is the ultimate community-driven memecoin, blending decentralized finance (DeFi) with pure internet culture. Designed for fun, memes, and moon missions, $DGB is more than just a token—it’s a movement.<br />
<br />
Why DoggoByte?<br />
- 100% Community-Owned – No team allocation, just fair launch.<br />
- Deflationary Supply – Every transaction burns a small % of tokens.<br />
- Instant Swaps & Low Fees – Powered by [Insert Blockchain Name].<br />
- NFT & Metaverse Integrations – Get exclusive DoggoByte NFTs.<br />
- Meme-Powered Utility – Because fun IS utility!`,
    tokenomics: [
      "Total Supply: 1,000,000,000 DGB",
      "2% Burn per transaction",
      "5% Goes to Liquidity Pool",
      "3% Auto-Redistributed to Holders",
    ],
    bondingCurve: "There are 299,999,233 DGB still available for sale...",
    holderDistribution: [
      "TTfv...7Aw | Bonding Curve: 33.23%",
      "TLXC...1pX2 | Creator: 0%",
      "TLik...5XFG: 66%",
    ],
    exclusivity: {
      humans: 204,
      failRate: 75,
      botsFiltered: 602454,
    },
  });
};

function TokenDetail() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchTokenData().then((tokenData) => {
      setData(tokenData);
    });
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <Protected>
      <main>
        <div className="container mx-auto py-12">
          <Link href="/" className="text-blue-500">
            Back
          </Link>

          {/* Image Banner */}
          <div className="mt-8">
            <img
              src={data.bannerImage}
              alt="Banner"
              className="w-full"
              style={{ height: '300px', objectFit: 'cover' }}
            />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <h1 className="text-3xl font-bold my-6">{data.name} - ${data.symbol}</h1>
              <p>Contract: {data.address}</p>

              <div className="mt-8">
                <h2 className="text-2xl font-bold">About</h2>
                <p dangerouslySetInnerHTML={{ __html: data.about }}></p>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-bold">Bonding Curve Progress</h2>
                <div className="w-full bg-gray-200 rounded-full h-4 mt-4 mb-6">
                  <div 
                    className="bg-black h-4 rounded-full transition-all duration-300" 
                    style={{ width: `20%` }}
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
                  {data.tokenomics.map((item: any, index: any) => (
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
                  {data.holderDistribution.map((item: any, index: any) => {
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
                <p>{data.exclusivity.humans} human got in</p>
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
