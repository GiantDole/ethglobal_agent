"use client";

import React from "react";
import { usePathname } from "next/navigation";

// Components
import SpeechInterface from "@/components/ui/SpeechInterface";

export default function BouncerPage() {
  const pathname = usePathname();

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
