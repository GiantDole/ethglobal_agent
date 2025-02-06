import { Client } from "..";

class InteractionClient extends Client {
  constructor(url: string) {
    super(`${url}/api/interaction`);
  }

  async interact({cookieAuthToken, cookieIdToken}: {cookieAuthToken: string, cookieIdToken: string | undefined}, projectId: string, userInput: string) {
    return this.request(`/${projectId}`, {
      method: 'POST',
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Cookie": `privy-token=${cookieAuthToken}; privy-id-token=${cookieIdToken}`
      },
      body: JSON.stringify({
        "answer": userInput,
      }),
    });
  }
  
}

export default InteractionClient;
