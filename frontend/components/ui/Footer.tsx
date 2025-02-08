import React from "react";
import Image from "next/image";

// Images
import Logo from "@/assets/footer/ethglobal.svg";
import Privy from "@/assets/footer/privy.svg";

export const Footer = () => {
  return (
    <div className="flex bg-black min-h-96 p-3">
      <div className="border border-[#FF8585] flex-1 py-4 px-6 flex flex-col gap-6 sm:flex-row gap-0">
        <div className="flex-1">
          <h3 className="text-[#FF8585] tracking-[6px] text-base font-light mb-3">
            HACKED FOR
          </h3>
          <Image src={Logo} alt="Logo" />
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <h3 className="text-[#FF8585] tracking-[6px] text-base font-light">
            SPONSORS
          </h3>
          <Image src={Privy} alt="Privy" />
        </div>
      </div>
    </div>
  );
};
