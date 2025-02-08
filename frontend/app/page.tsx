"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

// Clients
import ProjectClient from "../clients/Projects";

// Images
import Connect from "@/assets/header/connect_icon.svg";
import Logo from "@/assets/header/logo.svg";
import Hero from "@/assets/hero/hero.png";
import Net from "@/assets/hero/net.svg";
import Badge from "@/assets/hero/hero_badge.svg";
import Star from "@/assets/landing/star.svg";
import Active from "@/assets/landing/active.svg";
import Orbit from "@/assets/landing/orbit.svg";
import Future from "@/assets/landing/future.svg";
import Frame from "@/assets/landing/frame.png";
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
};

const projectClient = new ProjectClient(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
);

export default function Page() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <div className="container mx-auto py-12 px-24">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto py-12 px-24 text-red-500">{error}</div>
    );
  }

  return (
    <main>
      <div className="relative">
        <Image
          src={Badge}
          alt="Badge"
          className="absolute top-0 right-[20%] z-0"
        />
        <div className="flex justify-between p-4">
          <Image src={Logo} alt="Logo" />
          <Image src={Connect} alt="Connected" />
        </div>
        <div className="mt-36">
          <Image src={Hero} alt="Hero" className="mx-auto" />
        </div>
        <div>
          <Image src={Net} alt="Net" className="ml-auto" />
        </div>
      </div>
      <div className="container mx-auto">
        <div className="flex justify-between">
          <Image src={Star} alt="Star" />
          <Image src={Active} alt="Active" />
          <Image src={Star} alt="Star" />
        </div>
        <div className="flex flex-wrap gap-6 mt-5">
          {tokens.map((token) => (
            <Link key={token.id} href={`/token/${token.id}`}>
              <div className="w-60 p-2 cursor-pointer">
                <div className="relative flex items-center justify-center">
                  <Image
                    src={"/images/avatar.png"}
                    alt={token.name}
                    width={168}
                    height={168}
                    className="absolute clip ml-[-6px] mt-[1px]"
                  />
                  <Image src={Frame} alt="Frame" className="relative" />
                </div>
                <div>
                  <h3 className="text-base tracking-[6px] text-[#D9D9D9] py-2">
                    CATEGORY
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
                <p className="text-xs text-[#CECECE] mb-2">
                  {token.short_description}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Image src={Fire} alt="Fire" />
                    <p className="mt-1 text-[#FF8585] tracking-[1px]">
                      MARKET CAP
                    </p>
                  </div>
                  <div>
                    <p className="font-bold">$100K</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Image src={Target} alt="Target" />
                    <p className="text-[#FF8585] tracking-[1px]">EXCLUSIVITY</p>
                  </div>
                  <div>
                    <p className="font-bold">%6</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Image src={Orbit} alt="Orbit" className="ml-[20%] mt-12" />
      <div className="container mx-auto mb-16">
        <div className="flex justify-between mt-[-72px]">
          <Image src={Star} alt="Star" />
          <Image src={Future} alt="Active" />
          <Image src={Star} alt="Star" />
        </div>
        <div className="flex flex-wrap gap-6 mt-5">
          {tokens.map((token) => (
            <Link key={token.id} href={`/token/${token.id}`}>
              <div className="w-60 p-2 cursor-pointer border border-[#FF8585]">
                <div className="relative flex items-center justify-center">
                  <Image
                    src={"/images/avatar.png"}
                    alt={token.name}
                    width={234}
                    height={234}
                  />
                </div>
                <div>
                  <h3 className="text-base tracking-[6px] text-[#D9D9D9] py-2">
                    CATEGORY
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
                <p className="text-xs text-[#CECECE] mb-2">
                  {token.short_description}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Image src={Fire} alt="Fire" />
                    <p className="mt-1 text-[#FF8585] tracking-[1px]">
                      MARKET CAP
                    </p>
                  </div>
                  <div>
                    <p className="font-bold">$100K</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Image src={Target} alt="Target" />
                    <p className="text-[#FF8585] tracking-[1px]">EXCLUSIVITY</p>
                  </div>
                  <div>
                    <p className="font-bold">%6</p>
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
