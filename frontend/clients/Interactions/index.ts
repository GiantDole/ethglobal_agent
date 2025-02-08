import { Client } from "..";

class InteractionClient extends Client {
  constructor() {
    super('/api/interaction');
  }

  async interact(projectId: string, userInput: string, reset: boolean = false) {
    return this.request(`/${projectId}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "answer": userInput,
        "reset": reset,
      }),
    });
  }
  
}

export default InteractionClient;
