"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Components
import { ConnectWallet } from "./ConnectWallet";
import { Modal } from "./Modal";

// Images
import Logo from "@/assets/header/logo.svg";
import X from "@/assets/header/nav_x.svg";
import Documentation from "@/assets/header/nav_documentation.svg";
import Create from "@/assets/header/nav_create.svg";
import GoToX from "@/assets/header/modal_gox.svg";

export const Header = () => {
  const pathname = usePathname();

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="my-6 px-4">
          <h1 className="mb-4 text-center font-bold text-2xl">
            <span className="text-[#FF8585]">Bouncer AI</span> is coming soon!
          </h1>
          <h3 className="font-bold">To join waitlist:</h3>
          <ul>
            <li className="list-disc ml-4">Follow us on X!</li>
            <li className="list-disc ml-4">DM us on X!</li>
          </ul>
          <div className="flex justify-center mt-8">
            <a href="https://x.com/bouncer_ai" target="_blank">
              <Image src={GoToX} alt="" />
            </a>
          </div>
        </div>
      </Modal>
      <div className="flex gap-4 items-center lg:gap-16">
        <h1 className="text-2xl font-bold">
          <Link href="/">
            <Image src={Logo} alt="Logo" />
          </Link>
        </h1>
        <div>
          <ul className="hidden md:flex gap-4 lg:gap-16">
            <li>
              <a
                href="https://github.com/GiantDole/ethglobal_agent/blob/main/README.md"
                target="_blank"
              >
                <Image src={Documentation} alt="Documentation" />
              </a>
            </li>
            <li>
              <a href="https://x.com/bouncer_ai" target="_blank">
                <Image src={X} alt="X" />
              </a>
            </li>
            <li
              className="hover:cursor-pointer"
              onClick={() => setModalOpen(true)}
            >
              <Image src={Create} alt="Create" />
            </li>
          </ul>
        </div>
      </div>
      <ConnectWallet />
    </div>
  );
};
