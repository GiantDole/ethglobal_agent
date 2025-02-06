import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import SpeechInterface from "@/components/utils/SpeechInterface";

import UserClient from "../../../clients/User";
const userClient = new UserClient("http://localhost:3000");

export default async function BouncerPage() {
  const cookieStore = await cookies();
  const cookieAuthToken = cookieStore.get("privy-token")?.value;
  const cookieIdToken = cookieStore.get("privy-id-token")?.value;

  if (cookieAuthToken) {
    const res = await userClient.authenticate(cookieAuthToken, cookieIdToken);
    if (res.status !== 200) {
      redirect("/");
    }
  } else {
    redirect("/");
  }

  return (
    <div>
      <SpeechInterface
        cookie={{
          authToken: cookieAuthToken,
          idToken: cookieIdToken,
        }}
      />
    </div>
  );
}
