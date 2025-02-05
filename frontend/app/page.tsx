"use client";

import { useRouter } from "next/navigation";
// import { redirect } from "next/navigation";
// import Login from "../components/login";

// import { PrivyClient } from "@privy-io/server-auth";
// import { cookies } from "next/headers";

import { useState, useEffect } from "react";
import Link from 'next/link';

type Token = {
  name: string;
  description: string;
  marketCap: string;
  exclusivity: string;
  image: string;
  address: string;
};

export default function Page() {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>([]);

  useEffect(() => {
    const mockTokens: Token[] = [
      {
        name: "DoggoByte",
        description: "DoggoByte (SDGB) is the ultimate community-driven memecoin.",
        marketCap: "$100K",
        exclusivity: "6%",
        image: "/images/avatar.png",
        address: "doggobyte-address",
      },
      {
        name: "Tokenname",
        description: "Description Text",
        marketCap: "$100K",
        exclusivity: "6%",
        image: "/images/avatar.png",
        address: "tokenname-address",
      },
      {
        name: "Tokenname",
        description: "Description Text",
        marketCap: "$100K",
        exclusivity: "6%",
        image: "/images/avatar.png",
        address: "tokenname-address",
      },
      {
        name: "Tokenname",
        description: "Description Text",
        marketCap: "$100K",
        exclusivity: "6%",
        image: "/images/avatar.png",
        address: "tokenname-address",
      },
      {
        name: "Tokenname",
        description: "Description Text",
        marketCap: "$100K",
        exclusivity: "6%",
        image: "/images/avatar.png",
        address: "tokenname-address",
      },
      {
        name: "Tokenname",
        description: "Description Text",
        marketCap: "$100K",
        exclusivity: "6%",
        image: "/images/avatar.png",
        address: "tokenname-address",
      },
    ];

    setTokens(mockTokens);
  }, []);

  // const cookieStore = await cookies()
  // const cookieAuthToken = cookieStore.get("privy-token")?.value;

  // if (cookieAuthToken){
  //   const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  //   const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
  //   const client = new PrivyClient(PRIVY_APP_ID!, PRIVY_APP_SECRET!);

  //   try {
  //     const claims = await client.verifyAuthToken(cookieAuthToken);
  //     console.log({ claims });

  //     redirect("/dashboard");
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }

  return (
    <main>
      <div className="container mx-auto py-12 px-24">
        <h1 className="text-4xl font-bold mb-10">Current Events</h1>
        <div className="grid grid-cols-4 gap-4">
          {tokens.map((token, index) => (
            <Link key={index} href={`/token/${token.address}`}>
              <div className="p-4 border rounded-lg shadow-md cursor-pointer">
                <img src={token.image} alt={token.name} className="w-full h-64 object-cover mb-2" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Created by: Autor</span>
                  <span className="text-xl">🔗</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold">{token.name}</h3>
                  <span className="text-lg font-bold">$DGB</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{token.description}</p>
                <p className="text-sm font-semibold">Market Cap: {token.marketCap}</p>
                <p className="text-sm font-semibold">Exclusivity: {token.exclusivity}</p>
              </div>
            </Link>
          ))}
        </div>
        <button
          className="mt-6 text-blue-500"
          onClick={() =>
            router.push("/token/TAp4f5i5Ct4XMhDiJzGGjBUA1UoWFKZtXs")
          }
        >
          Redirect to Token Details
        </button>
      </div>
    </main>
  );
}
