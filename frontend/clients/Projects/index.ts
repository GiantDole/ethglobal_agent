import { Client } from "..";

class ProjectClient extends Client {
  constructor() {
    super('/api/projects');
  }

  async getAll() {
    return this.request('/');
  }

  async get(id: string) {
    return this.request(`/${id}`);
  }
}

export default ProjectClient;
