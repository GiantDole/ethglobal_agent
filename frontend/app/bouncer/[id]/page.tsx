'use client';

import React from "react";
import SpeechInterface from "@/components/ui/SpeechInterface";
// import { useRouter } from "next/navigation";
import { getCookie } from "cookies-next";
// import UserClient from "../../../clients/User";


// const userClient = new UserClient(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export default function BouncerPage() {
//   const router = useRouter();

//   useEffect(() => {
//     const authenticate = async () => {
//       const cookieAuthToken = getCookie("privy-token");
//       const cookieIdToken = getCookie("privy-id-token");
//       console.log(cookieAuthToken, cookieIdToken);
//       if (cookieAuthToken) {
//         const res = await userClient.authenticate(cookieAuthToken.toString(), cookieIdToken?.toString());
//         console.log(res);

//       } else {
//         router.push("/");
//       }
//     };

//     authenticate();
//   }, [router]);

//   const cookieAuthToken = getCookie("privy-token");
//   const cookieIdToken = getCookie("privy-id-token");

  return (
    <div>
      <SpeechInterface/>
    </div>
  );
}
