"use client";
import Image from "next/image";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { getCookie } from "cookies-next";

// Images
import Connect from "@/assets/header/connect_icon.svg";
import Connected from "@/assets/header/connected_icon.svg";
import ConnectBorder from "@/assets/header/connect_wallet.svg";
import ConnectedBorder from "@/assets/header/connected_wallet.svg";

// Clients
import UserClient from "@/clients/User";

const userClient = new UserClient(process.env.NEXT_PUBLIC_API_URL);

export const ConnectWallet = () => {
  const router = useRouter();

  // Once the login is successful, register user to backend
  const handleNewUser = async () => {
    const cookieAuthToken = getCookie("privy-token");
    if (cookieAuthToken) {
      await userClient.authenticate();
    } else {
      router.push("/");
    }
  };

  const { login } = useLogin({
    onComplete: async ({ isNewUser, wasAlreadyAuthenticated }) => {
      if (wasAlreadyAuthenticated) {
        await userClient.authenticate();
        router.push("/");
      } else {
        if (isNewUser) {
          handleNewUser();
        }
      }
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const { user, logout } = usePrivy();

  return (
    <div className="flex gap-4 items-center">
      {user ? (
        <div
          className="relative flex justify-center items-center hover:cursor-pointer"
          onClick={() => {
            if (user) {
              logout();
            } else {
              login();
            }
          }}
        >
          <Image src={ConnectedBorder} alt="Connected Border" />
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#478A00] w-full text-center text-xl">
            {`${user.wallet?.address.slice(
              0,
              6,
            )}...${user.wallet?.address.slice(-4)}`}
          </p>
        </div>
      ) : (
        <div
          className="relative flex justify-center items-center hover:cursor-pointer"
          onClick={() => {
            if (user) {
              logout();
            } else {
              login();
            }
          }}
        >
          <Image src={ConnectBorder} alt="Connect Border" />
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#FF8585] w-full text-center text-xl">
            Connect Wallet
          </p>
        </div>
      )}
      {user ? (
        <Image src={Connected} alt="Connected" />
      ) : (
        <Image src={Connect} alt="Connect" />
      )}
    </div>
  );
};
