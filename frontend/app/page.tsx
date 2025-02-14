"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

// Clients
import ProjectClient from "../clients/Projects";

// Images
import Hero from "@/assets/hero/hero.png";
import Net from "@/assets/hero/net.svg";
import Star from "@/assets/landing/star.svg";
import Active from "@/assets/landing/active.svg";
import Orbit from "@/assets/landing/orbit.svg";
import Future from "@/assets/landing/future.svg";
import Background from "@/assets/landing/background.png";
import World from "@/assets/landing/world.svg";
import Fire from "@/assets/landing/fire.svg";
import Target from "@/assets/landing/target.svg";

type Token = {
  id: number;
  name: string;
  short_description: string;
  token_ticker: string | null;
  token_address: string | null;
  author: string;
  status: number;
  created_at: string;
  image_url: string;
  category: string;
  exclusivity: number;
};

const projectClient = new ProjectClient();

export default function Page() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add filtering logic for active and future tokens
  const activeTokens = tokens.filter((token) => token.status === 1);
  const futureTokens = tokens.filter((token) => token.status === 0);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const data = await projectClient.getAll();
        if (data) {
          setTokens(data);
        }
      } catch (err) {
        setError("Failed to fetch tokens");
        console.error("Error fetching tokens:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
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

  return (
    <main>
      <div className="relative z-[0]">
        <Image
          src={Background}
          alt="Background"
          className="absolute top-0 left-0 w-full min-h-[100vh] object-cover max-h-[1080px]"
        />
        <div className="relative pt-48">
          <Image src={Hero} alt="Hero" className="mx-auto relative" />
        </div>
        <div>
          <Image src={Net} alt="Net" className="ml-auto" />
        </div>
      </div>
      <div className="relative container mx-auto z-[1]">
        <div className="flex justify-between">
          <Image src={Star} alt="Star" />
          <Image src={Active} alt="Active" />
          <Image src={Star} alt="Star" />
        </div>
        <div className="flex flex-wrap gap-5 mt-5 justify-center lg:justify-start p-4">
          {activeTokens.map((token) => (
            <Link key={token.id} href={`/token/${token.id}`}>
              <div className="w-[240px] p-2 cursor-pointer">
                <div className="relative mb-5 flex items-center justify-center w-[200px] h-[200px] border border-[#FF8585] rounded-full mx-auto overflow-hidden">
                  <Image
                    src={token.image_url}
                    alt={token.name}
                    width={200}
                    height={200}
                  />
                </div>
                <div>
                  <h3 className="font-light tracking-[6px] text-[#D9D9D9] mb-2">
                    {token.category.toUpperCase()}
                  </h3>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[#FF8585] text-xs">
                    Created by: {token.author}
                  </p>
                  <Image src={World} alt="World" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-base font-bold">{token.name}</p>
                  <p>${token.token_ticker}</p>
                </div>
                <p className="text-xs text-[#CECECE] mb-2 line-clamp-4 overflow-hidden h-[80px]">
                  {token.short_description}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Image src={Fire} alt="Fire" />
                    <p className="text-xs mt-1 text-[#FF8585] tracking-[1px]">
                      MARKET CAP
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-xs">$100K</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image src={Target} alt="Target" />
                    <p className="text-xs text-[#FF8585] tracking-[1px]">
                      EXCLUSIVITY
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-xs">
                      {token.exclusivity * 100}%
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Image src={Orbit} alt="Orbit" className="ml-[20%] mt-12" />
      <div className="container mx-auto">
        <div className="flex justify-between mt-[-72px]">
          <Image src={Star} alt="Star" />
          <Image src={Future} alt="Active" />
          <Image src={Star} alt="Star" />
        </div>
        <div className="flex flex-wrap gap-5 mt-5 justify-center lg:justify-start p-4">
          {futureTokens.map((token) => (
            <Link key={token.id} href={`/token/${token.id}`}>
              <div className="w-[240px] p-2 cursor-pointer border border-[#FF8585]">
                <div className="relative mb-5 flex items-center justify-center">
                  <Image
                    src={token.image_url}
                    alt={token.name}
                    width={234}
                    height={234}
                  />
                </div>
                <div>
                  <h3 className="text-base font-light tracking-[6px] text-[#D9D9D9] mb-2">
                    {token.category.toUpperCase()}
                  </h3>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[#FF8585] text-xs">
                    Created by: {token.author}
                  </p>
                  <Image src={World} alt="World" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-base font-bold">{token.name}</p>
                  <p>${token.token_ticker}</p>
                </div>
                <p className="text-xs text-[#CECECE] mb-2 line-clamp-4 overflow-hidden h-[80px]">
                  {token.short_description}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Image src={Fire} alt="Fire" />
                    <p className="text-xs mt-1 text-[#FF8585] tracking-[1px]">
                      MARKET CAP
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-xs">$100K</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image src={Target} alt="Target" />
                    <p className="text-xs text-[#FF8585] tracking-[1px]">
                      EXCLUSIVITY
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-xs">60%</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
