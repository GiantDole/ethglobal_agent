"use client";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { getCookie } from "cookies-next";
import UserClient from "@/clients/User";

const userClient = new UserClient(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

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
  const {login} = useLogin({
    onComplete: ({isNewUser, wasAlreadyAuthenticated}) => {
      if (wasAlreadyAuthenticated) {
        router.push('/');
      } else {
        if(isNewUser) {
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
    <button
      className="border border-black px-6 py-2"
      onClick={() => {
        if (user) {
          logout();
        } else {
          login();
        }
      }}
    >
      {user ? "Disconnect Wallet" : "Connect Wallet"}
    </button>
  );
};
