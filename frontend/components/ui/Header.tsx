import Link from "next/link";
import Image from "next/image";

// Components
import { ConnectWallet } from "./ConnectWallet";

// Images
import Logo from "@/assets/header/logo.svg";
import Token from "@/assets/header/nav_token.svg";
import About from "@/assets/header/nav_about.svg";
import Documentation from "@/assets/header/nav_documentation.svg";

export const Header = () => {
  return (
    <div className="px-4 py-4 flex justify-between items-center bg-black">
      <div className="flex gap-16 items-center">
        <h1 className="text-2xl font-bold">
          <Link href="/">
            <Image src={Logo} alt="Logo" />
          </Link>
        </h1>
        <div>
          <ul className="flex gap-16">
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
