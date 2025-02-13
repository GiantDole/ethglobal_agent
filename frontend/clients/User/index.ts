import { Client } from "..";

class UserClient extends Client {
  constructor() {
    super('/api/user');
  }

  async authenticate() {
    return this.request("/register", {
      method: "POST",
      credentials: "include", // Include cookies in the request
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

export default UserClient;
