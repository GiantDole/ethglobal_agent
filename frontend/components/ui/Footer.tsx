"use client";
import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Images
import Logo from "@/assets/footer/ethglobal.svg";
import Privy from "@/assets/footer/privy.svg";
import Nethermind from "@/assets/footer/nethermind.png";
import Arbitrum from "@/assets/footer/arbitrum.png";
import Covalent from "@/assets/footer/covalent.png";

export const Footer = () => {
  const pathname = usePathname();
  return (
    <div
      className={`${
        pathname.includes("/bouncer") ? "hidden" : ""
      } flex bg-black min-h-96 p-3`}
    >
      <div className="border border-[#FF8585] flex-1 py-4 px-6 flex flex-col gap-6 sm:flex-row gap-0">
        <div className="flex-1">
          <h3 className="text-[#FF8585] tracking-[6px] text-base font-light mb-3">
            HACKED FOR
          </h3>
          <Image src={Logo} alt="Logo" height={40} />
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <h3 className="text-[#FF8585] tracking-[6px] text-base font-light">
            TECHNOLOGIES
          </h3>
          <Image src={Privy} alt="Privy" height={35} />
          <Image src={Nethermind} alt="Nethermind" height={40} />
          <Image src={Arbitrum} alt="Arbitrum" height={60} />
          <Image src={Covalent} alt="Covalent" height={35} />
        </div>
      </div>
    </div>
  );
};
