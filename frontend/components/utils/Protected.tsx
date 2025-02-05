"use client";

import { usePrivy } from "@privy-io/react-auth";
import { redirect } from "next/navigation";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();

  if (!ready && !authenticated) {
    return null;
  }

  if (ready && !authenticated) {
    redirect("/");
  }

  return <>{children}</>;
}
