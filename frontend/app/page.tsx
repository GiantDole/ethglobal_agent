"use client";

import { useRouter } from "next/navigation";
// import { redirect } from "next/navigation";
// import Login from "../components/login";

// import { PrivyClient } from "@privy-io/server-auth";
// import { cookies } from "next/headers";

export default function Page() {
  const router = useRouter();

  // const cookieStore = await cookies()
  // const cookieAuthToken = cookieStore.get("privy-token")?.value;

  // if (cookieAuthToken){
  //   const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  //   const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
  //   const client = new PrivyClient(PRIVY_APP_ID!, PRIVY_APP_SECRET!);

  //   try {
  //     const claims = await client.verifyAuthToken(cookieAuthToken);
  //     console.log({ claims });

  //     redirect("/dashboard");
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }

  return (
    <main>
      <div className="container mx-auto py-12">
        <h3>Bouncer AI</h3>
        <h1 className="text-4xl font-bold">Landing Page</h1>
        <button
          className="mt-6 text-blue-500"
          onClick={() =>
            router.push("/token/TAp4f5i5Ct4XMhDiJzGGjBUA1UoWFKZtXs")
          }
        >
          Redirect to Token Details
        </button>
      </div>
    </main>
  );
}
