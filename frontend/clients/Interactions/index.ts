import { Client } from "..";

class InteractionClient extends Client {
  constructor(url: string) {
    super(`${url}/api/interaction`);
  }

  async interact(projectId: string, userInput: string) {
    return this.request(`/${projectId}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "answer": userInput,
      }),
    });
  }
  
}

export default InteractionClient;
