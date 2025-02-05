import { redirect } from "next/navigation";
import Login from "../components/login";

import { PrivyClient } from "@privy-io/server-auth";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies()
  const cookieAuthToken = cookieStore.get("privy-token")?.value;
  const cookieIdToken = cookieStore.get("privy-id-token")?.value;

  if (cookieAuthToken){
    //query localhost:3000/api/register
    const response = await fetch("http://localhost:8000/api/user/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Manually set the Cookie header with the tokens
        "Cookie": `privy-token=${cookieAuthToken}; privy-id-token=${cookieIdToken}`
      },
    });
    const data = await response.json();
    console.log(data);

    const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
    const client = new PrivyClient(PRIVY_APP_ID!, PRIVY_APP_SECRET!);

    try {
      const claims = await client.verifyAuthToken(cookieAuthToken);
      console.log({ claims });

      redirect("/dashboard");
    } catch (error) {
      console.error(error);
    }
  }

  return <Login />
}