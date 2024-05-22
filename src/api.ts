import { HTTP } from "koishi";
import {
  Project,
  ProjectData,
  ProjectInfo,
  ProjectList,
  Provider,
  ProviderList,
  Release,
  ReleaseList,
  ReleaseNote,
  WebhookList,
} from "./types";

export class API {
  static endpoint = "https://api.newreleases.io/v1";

  private http: HTTP;
  constructor(http: HTTP) {
    this.http = http;
  }

  async listProjects(page: number = 1): Promise<ProjectList> {
    const url = `${API.endpoint}/projects`;
    const resp = await this.http.get<ProjectList>(url, {
      params: { page },
    });
    return resp;
  }

  async listProjectsByProvider(
    provider: Provider,
    page: number = 1
  ): Promise<ProjectList> {
    const url = `${API.endpoint}/projects/${provider}`;
    const resp = await this.http.get<ProjectList>(url, {
      params: { page },
    });
    return resp;
  }

  async getProject(provider: Provider, name: string): Promise<Project> {
    try {
      const url = `${API.endpoint}/projects/${provider}/${name}`;
      const project = await this.http.get<Project>(url);
      return project;
    } catch (e) {
      return null;
    }
  }

  async addProject(data: ProjectData): Promise<Project> {
    try {
      const url = `${API.endpoint}/projects`;
      const project = await this.http.post<Project>(url, data);
      return project;
    } catch (error) {
      return null;
    }
  }

  async updateProject(
    provider: Provider,
    name: string,
    info: ProjectInfo
  ): Promise<Project> {
    const url = `${API.endpoint}/projects/${provider}/${name}`;
    const project = await this.http.post<Project>(url, info);
    return project;
  }

  async deleteProject(id: string) {
    const url = `${API.endpoint}/projects/${id}`;
    const data = await this.http.delete(url);
    return data;
  }

  async listReleases(
    provider: string,
    name: string,
    page: number = 1
  ): Promise<ReleaseList> {
    const url = `${API.endpoint}/projects/${provider}/${name}/releases`;
    const resp = await this.http.get<ReleaseList>(url, {
      params: {
        page,
      },
    });
    return resp;
  }

  async getRelease(
    provider: Provider,
    name: string,
    version?: string
  ): Promise<Release> {
    if (!version) {
      return await this.getLatestRelease(provider, name);
    }

    const url = `${`${API.endpoint}/projects/${provider}/${name}`}/releases/${version}`;
    const release = await this.http.get<Release>(url);
    return release;
  }

  async getLatestRelease(provider: Provider, name: string): Promise<Release> {
    try {
      const url = `${`${API.endpoint}/projects/${provider}/${name}`}/latest-release`;
      const release = await this.http.get<Release>(url);
      return release;
    } catch (error) {
      return null;
    }
  }

  async getReleaseNote(
    provider: string,
    name: string,
    version: string
  ): Promise<ReleaseNote> {
    const url = `${`${API.endpoint}/projects/${provider}/${name}`}/releases/${version}/note`;
    const note = await this.http.get<ReleaseNote>(url);
    return note;
  }

  async getProviders(): Promise<ProviderList> {
    const url = `${API.endpoint}/providers`;
    const resp = await this.http.get<ProviderList>(url);
    return resp;
  }

  async getWebhooks() {
    const url = `${API.endpoint}/webhooks`;
    const resp = await this.http.get<WebhookList>(url);
    return resp;
  }
}
