import { Context, Schema, Session } from "koishi";

import { API } from "./api";
import { Provider, providers } from "./types";

class NewReleases {
  static name = "newreleases";

  private config: NewReleases.Config;
  private api: API;

  constructor(ctx: Context, config: NewReleases.Config) {
    ctx.i18n.define("zh-CN", require("./locales/zh-CN"));
    this.config = config;

    this.api = new API(
      ctx.http.extend({
        headers: {
          "X-Key": this.config.apiKey,
        },
      })
    );

    ctx.command("newreleases").alias("nr");

    ctx
      .command("nr.info <name:string> [version:string]")
      .option("provider", "-p <provider:string>", {
        fallback: config.defaultProvider,
      })
      .option("list", "-l")
      .action(async ({ session, options }, name, version) => {
        const provider = options.provider as Provider;
        const project = await this.getProject(session, provider, name);
        if (!project) return;

        if (options.list) {
          const { releases } = await this.api.listReleases(provider, name);
          releases.map((r) => (r.date = new Date(r.date).toLocaleString()));
          return session.text(".release-list", { project, releases });
        }

        let release = await this.api.getRelease(provider, name, version);
        if (release) {
          release.date = new Date(release.date).toLocaleString();
        }
        return session.text(".release-info", { project, release });
      });
  }

  async getProject(session: Session, provider: Provider, name: string) {
    if (!name) {
      session.send(session.text("newreleases.project-name-required"));
      return null;
    }

    if (!providers.includes(provider)) {
      session.send(session.text("newreleases.invalid-provider", { provider }));
      return null;
    }

    let project = await this.api.getProject(provider, name);

    if (!project) {
      project = await this.api.addProject({ provider, name });
    }

    if (!project) {
      session.send(
        session.text("newreleases.project-not-found", { provider, name })
      );
      return null;
    }
    return project;
  }
}

namespace NewReleases {
  export interface Config {
    apiKey: string;
    defaultProvider: Provider;
  }

  export const Config: Schema<Config> = Schema.object({
    apiKey: Schema.string().required().description("API 密钥"),
    defaultProvider: Schema.union(providers)
      .default("github")
      .description("默认平台"),
  }).description("基础设置");
}

export default NewReleases;
