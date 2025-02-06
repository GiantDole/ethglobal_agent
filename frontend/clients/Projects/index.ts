import { Client } from "..";

class ProjectClient extends Client {
  constructor(url: string) {
    super(`${url}/api/projects`);
  }

  async getAll() {
    return this.request('/');
  }

  async get(id: string) {
    return this.request(`/${id}`);
  }
}

export default ProjectClient;
