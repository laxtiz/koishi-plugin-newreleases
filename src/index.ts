import { Context, Schema, Session, h, KoishiDatabase } from "koishi";
import {} from "@koishijs/plugin-server";
import { createHmac } from "crypto";

import { API } from "./api";
import { Payload, Provider, providers } from "./types";

class NewReleases {
  static name = "newreleases";
  static inject = ["database", "server"];

  private api: API;

  constructor(ctx: Context, config: NewReleases.Config) {
    ctx.i18n.define("zh-CN", require("./locales/zh-CN"));

    this.api = new API(
      ctx.http.extend({
        headers: {
          "X-Key": config.apiKey,
        },
      })
    );

    ctx.model.extend(
      "newreleases",
      {
        id: "unsigned",
        provider: "string",
        name: "string",
        platform: "string",
        cid: "string",
      },
      {
        autoInc: true,
      }
    );

    ctx.command("newreleases").alias("nr");

    // 查询项目信息
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

    // 不开启通知提醒
    if (!config.notification) {
      return;
    }

    ctx.on("ready", async () => {
      ctx.server.post(config.path, async (c) => {
        if (config.webhookSecret) {
          const signature = c.req.headers["x-newreleases-signature"] as string;
          const timestamp = c.req.headers["x-newreleases-timestamp"] as string;

          const digest = createHmac("sha256", config.webhookSecret)
            .update(timestamp)
            .update(".")
            .update(c.request.rawBody)
            .digest("hex");
          if (signature !== digest) {
            c.status = 401;
            c.body = "Unauthorized";
            return;
          }
        }

        const payload = c.request.body as Payload;
        const watchs = await ctx.database.get("newreleases", {
          provider: payload.provider,
          name: payload.project,
        });
        const channels = watchs.map((w) => `${w.platform}:${w.cid}`);
        const msg = h.i18n("newreleases.notification", [
          payload.project,
          payload.provider,
          payload.version,
          new Date(payload.time).toLocaleString(),
        ]);

        try {
          // @ts-ignore
          await ctx.broadcast(channels, msg);
        } catch (error) {}

        c.body = "ok";
      });
    });

    ctx = ctx.guild();

    // 订阅项目更新通知
    ctx
      .command("nr.watch <name:string>", { authority: 3 })
      .option("provider", "-p <provider:string>", {
        fallback: config.defaultProvider,
      })
      .action(async ({ session, options }, name) => {
        const provider = options.provider as Provider;
        const project = await this.getProject(session, provider, name);
        if (!project) return;

        const { webhooks } = await this.api.getWebhooks();
        const w = webhooks.find((w) => w.name === config.webhookName);
        if (!w) {
          return session.text(".webhook-not-found", {
            name: config.webhookName,
          });
        }

        if (!project.webhooks) {
          project.webhooks = [];
        }

        if (!project.webhooks.includes(w.id)) {
          project.webhooks.push(w.id);
          await this.api.updateProject(provider, name, project);
        }

        const data: NewReleases.Watch = {
          provider: project.provider,
          name: project.name,
          platform: session.platform,
          cid: session.channelId,
        };
        const watchs = await ctx.database.get("newreleases", data);
        if (watchs.length === 0) {
          await ctx.database.create("newreleases", data);
        }

        return session.text(".notification-added", { project });
      });

    // 取消订阅
    ctx
      .command("nr.unwatch <name:string>", { authority: 3 })
      .option("provider", "-p <provider:string>", {
        fallback: config.defaultProvider,
      })
      .action(async ({ session, options }, name) => {
        const provider = options.provider as Provider;
        const project = await this.getProject(session, provider, name);
        if (!project) return;

        const data: NewReleases.Watch = {
          provider: project.provider,
          name: project.name,
          platform: session.platform,
          cid: session.channelId,
        };
        const watchs = await ctx.database.get("newreleases", data);
        if (watchs.length === 0) {
          return session.text(".notification-not-found", { project });
        }

        await ctx.database.remove("newreleases", data);
        return session.text(".notification-removed", { project });
      });

    // 查询已订阅的项目
    ctx.command("nr.list").action(async ({ session }) => {
      const watchs = await ctx.database.get("newreleases", {
        platform: session.platform,
        cid: session.channelId,
      });
      if (watchs.length === 0) {
        return session.text(".empty");
      }
      return session.text(".watch-list", { watchs });
    });
  }

  async getProject(session: Session, provider: Provider, name: string) {
    if (!name) {
      session.send(session.text("newreleases.project-name-required"));
      return null;
    }

    name = name.toLowerCase();
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
  interface BaseConfig {
    apiKey: string;
    defaultProvider: Provider;
    notification: boolean;
  }

  interface WebhookEnabledConfig {
    notification: true;
    path: string;
    webhookName: string;
    webhookSecret: string;
  }

  interface WebhookDisabledConfig {
    notification: false;
  }

  type WebhookConfig = WebhookEnabledConfig | WebhookDisabledConfig;

  export type Config = BaseConfig & WebhookConfig;

  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      apiKey: Schema.string().required().description("API 密钥"),
      defaultProvider: Schema.union(providers)
        .default("github")
        .description("默认平台"),
      notification: Schema.boolean().default(false).description("启用通知提醒"),
    }).description("基础设置"),
    Schema.union([
      Schema.object({
        notification: Schema.const(true).required(),
        path: Schema.string()
          .default("/webhook/newreleases")
          .description("Webhook 路径"),
        webhookName: Schema.string()
          .default("koishi")
          .description("Webhook 名称"),
        webhookSecret: Schema.string().description("Webhook 密钥"),
      }).description("Webhook 设置"),
      Schema.object({}),
    ]),
  ]) as any;

  export interface Watch {
    provider: Provider;
    name: string;
    platform: string;
    cid: string;
  }
}

declare module "koishi" {
  interface Tables {
    newreleases: NewReleases.Watch;
  }
}
export default NewReleases;
