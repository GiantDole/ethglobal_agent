import { Client } from "..";

class InteractionClient extends Client {
  constructor() {
    super('/api/interaction');
  }

  async interact(projectId: string, userInput: string, reset: boolean = false) {
    return this.request(`/${projectId}`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer: userInput,
        reset: reset,
      }),
    });
  }

  async getSignature(projectId: string, address: string) {
    console.log(`${this.url}/${projectId}/signature`);
    console.log(address);
    return this.request(`/${projectId}/signature`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userWalletAddress: address,
      }),
    });
  }
}

export default InteractionClient;
