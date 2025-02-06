import { redirect } from "next/navigation";
import Login from "../components/login";

import { PrivyClient } from "@privy-io/server-auth";
import { cookies } from "next/headers";

import UserClient from "../clients/User";
import ProjectClient from "../clients/Projects";
import InteractionClient from "../clients/Interactions";
const userClient = new UserClient("http://localhost:3000");
const projectClient = new ProjectClient("http://localhost:3000");
const interactionClient = new InteractionClient("http://localhost:3000");

export default async function Page() {
  const cookieStore = await cookies()
  const cookieAuthToken = cookieStore.get("privy-token")?.value;
  const cookieIdToken = cookieStore.get("privy-id-token")?.value;

  console.log("Cookie auth token:", cookieAuthToken);

  if (cookieAuthToken){
    // query localhost:3000/api/register
    // const response = await fetch("http://localhost:3000/api/user/register", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     // Manually set the Cookie header with the tokens
    //     "Cookie": `privy-token=${cookieAuthToken}; privy-id-token=${cookieIdToken}`
    //   },
    // });
    // const data = await response.json();
    const data = await userClient.authenticate(cookieAuthToken, cookieIdToken);
    console.log("User client data:", data);

    const projects = await projectClient.getAll();
    console.log("Projects:", projects);

    const project = await projectClient.get("1");
    console.log("Project:", project);

    const interaction = await interactionClient.interact({cookieAuthToken, cookieIdToken}, "1", "Hello");
    console.log("Interaction:", interaction);

    const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
    const client = new PrivyClient(PRIVY_APP_ID!, PRIVY_APP_SECRET!);

    try {
      const claims = await client.verifyAuthToken(cookieAuthToken);

      redirect("/dashboard");
    } catch (error) {
      console.error(error);
    }
  }

  return <Login />
}