import { Client } from "..";

class UserClient extends Client {
  constructor(url?: string) {
    super(url);
    this.url = `${this.url}/api/user`;
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
