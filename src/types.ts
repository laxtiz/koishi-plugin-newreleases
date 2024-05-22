export const providers = [
  "artifacthub",
  "bitbucket",
  "cargo",
  "codeberg",
  "cpan",
  "debian-gitlab",
  "dockerhub",
  "ecr-public",
  "exozyme",
  "freedesktop-gitlab",
  "gcr",
  "gems",
  "ghcr",
  "gitea",
  "github",
  "github-npm",
  "gitlab",
  "gnome-gitlab",
  "gnu-savannah",
  "hex",
  "kde-gitlab",
  "maven",
  "npm",
  "nuget",
  "packagist",
  "pypi",
  "quay",
  "sourceforge",
  "xfce-gitlab",
  "yarn",
] as const;

export type Provider = (typeof providers)[number];

export type ProviderList = { providers: Provider[] };

export interface Webhook {
  id: string;
  name: string;
}

export type WebhookList = { webhooks: Webhook[] };

export interface Paging {
  total_pages: number;
}

export interface ProjectInfo {
  webhooks?: string[];
  note?: string;
  tags?: string[];
}

export type ProjectData = {
  provider: Provider;
  name: string;
} & ProjectInfo;

export type Project = {
  id: string;
  url: string;
} & ProjectData;

export type ProjectList = { projects: Project[] } & Paging;

export interface Release {
  version: string;
  date: string;
  has_note?: boolean;
}

export type ReleaseList = { releases: Release[] } & Paging;

export interface ReleaseNote {
  title: string;
  message: string;
  url: string;
}

export interface Payload {
  provider: Provider;
  project: string;
  version: string;
  time: string;
  note: {
    title: string;
    message: string;
  };
  project_note: string;
}
