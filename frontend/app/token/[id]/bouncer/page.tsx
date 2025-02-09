"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import toast from "react-hot-toast";

// Components
import SpeechInterface from "@/components/ui/SpeechInterface";

export default function BouncerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = usePrivy();

  useEffect(() => {
    if (!user) {
      toast.error("You must be logged in to access this page");
      router.push(pathname.split("/bouncer")[0] || "/");
    }
  }, [user, router, pathname]);

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
