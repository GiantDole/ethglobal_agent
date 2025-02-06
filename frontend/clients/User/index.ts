import { Client } from "..";

class UserClient extends Client {
  constructor(url: string) {
    super(`${url}/api/user`);
  }

  async authenticate(cookieAuthToken: string, cookieIdToken: string | undefined) {
    return this.request('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Cookie": `privy-token=${cookieAuthToken}; privy-id-token=${cookieIdToken}`
      },
    });
  }
}

export default UserClient;
