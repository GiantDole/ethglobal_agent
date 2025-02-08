export class Client {
  url: string;

  constructor(url: string) {
    this.url = url.replace(/^https?:\/\/[^/]+/, '');
  }

  async request(path: string, options: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }) {
    try {
      const response = await fetch(`${this.url}${path}`, {
        ...options,
        credentials: 'include',
      });

      if (!response.ok) {
        console.error(`${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();

      if (data.error) {
        console.error(data.error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}