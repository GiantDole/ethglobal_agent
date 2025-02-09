"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Components
import { ConnectWallet } from "./ConnectWallet";

// Images
import Logo from "@/assets/header/logo.svg";
import Token from "@/assets/header/nav_token.svg";
import About from "@/assets/header/nav_about.svg";
import Documentation from "@/assets/header/nav_documentation.svg";

export const Header = () => {
  const pathname = usePathname();

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY < lastScrollY || currentScrollY < 10);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <div
      className={`px-4 py-4 flex justify-between items-center bg-black fixed w-full top-0 transition-transform duration-300 z-50 ${
        isVisible && !pathname.includes("/bouncer")
          ? "translate-y-0"
          : "-translate-y-full"
      }`}
    >
      <div className="flex gap-16 items-center">
        <h1 className="text-2xl font-bold">
          <Link href="/">
            <Image src={Logo} alt="Logo" />
          </Link>
        </h1>
        <div>
          <ul className="hidden md:flex gap-16">
            <li>
              <a href="#">
                <Image src={Token} alt="Token" />
              </a>
            </li>
            <li>
              <a href="#">
                <Image src={About} alt="About" />
              </a>
            </li>
            <li>
              <a href="#">
                <Image src={Documentation} alt="Documentation" />
              </a>
            </li>
          </ul>
        </div>
      </div>
      <ConnectWallet />
    </div>
  );
};
