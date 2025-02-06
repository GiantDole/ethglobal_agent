"use client";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import UserClient from "@/clients/User";
import { useRouter } from "next/navigation";

export const ConnectWallet = () => {
  const router = useRouter();
  const handleNewUser = () => {
    console.log("New user is detected. registering user to backend...");
    // TODO: register user to backend
  };
  const {login} = useLogin({
    onComplete: ({user, isNewUser, wasAlreadyAuthenticated, loginMethod}) => {
      console.log(JSON.stringify(user))
      if (wasAlreadyAuthenticated) {
        router.push('/');
      } else {
        if(isNewUser) {
          handleNewUser();
        } 
      }
      // Any logic you'd like to execute if the user is/becomes authenticated while this
      // component is mounted
    },
    onError: (error) => {
      console.log(error);
      // Any logic you'd like to execute after a user exits the login flow or there is an error
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
