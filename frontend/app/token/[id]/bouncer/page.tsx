"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { redirect } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import toast from "react-hot-toast";

// Components
import SpeechInterface from "@/components/ui/SpeechInterface";

export default function BouncerPage() {
  const pathname = usePathname();
  const { user } = usePrivy();

  if (!user) {
    toast.error("You must be logged in to access this page");
    redirect("/");
  }

  return (
    <div
      className={`${
        pathname.includes("/bouncer") ? "mt-[-96px]" : ""
      } min-h-screen`}
    >
      <SpeechInterface />
    </div>
  );
}
