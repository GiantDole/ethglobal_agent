"use client";
import { useLogin, usePrivy } from "@privy-io/react-auth";

export const ConnectWallet = () => {
  const { login } = useLogin();
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
