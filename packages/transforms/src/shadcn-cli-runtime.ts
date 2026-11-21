import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { configSchema } from "shadcn-vue/schema";

/** Pinned registry chunk bindings for shadcn-vue@2.8.2 (see shadcn-installer-parity.spec.ts). */
const REGISTRY_CHUNK_EXPORTS = {
  configWithDefaults: "ct",
  createConfig: "pt",
  transformInstallerSource: "et",
  defaultComponents: "lt",
  defaultUtils: "ft",
} as const;

type Config = typeof configSchema._output;

type RegistryChunk = Record<string, unknown>;

const shadcnRoot = await import.meta.resolve("shadcn-vue");
const registryChunkUrl = new URL("registry-hxzbzXMt.js", shadcnRoot).href;
const registryChunk = (await import(registryChunkUrl)) as RegistryChunk;

const shadcnVersion = (
  JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", shadcnRoot)), "utf8")) as {
    version: string;
  }
).version;

const pick = <T>(name: keyof typeof REGISTRY_CHUNK_EXPORTS, kind: "function" | "string"): T => {
  const key = REGISTRY_CHUNK_EXPORTS[name];
  const value = registryChunk[key];
  const ok =
    kind === "function"
      ? typeof value === "function"
      : typeof value === "string" && value.length > 0;
  if (!ok) {
    throw new Error(
      `shadcn-vue@${shadcnVersion}: registry chunk export "${String(key)}" (${name}) moved; update shadcn-cli-runtime.ts`,
    );
  }
  return value as T;
};

export const configWithDefaults = pick<(config?: Partial<Config>) => Config>(
  "configWithDefaults",
  "function",
);
export const createConfig = pick<(partial?: Partial<Config>) => Config>("createConfig", "function");
export const transformInstallerSource = pick<
  (opts: { filename: string; raw: string; config: Config; isRemote?: boolean }) => Promise<string>
>("transformInstallerSource", "function");

export const SHADCN_DEFAULT_COMPONENTS = pick<string>("defaultComponents", "string");
export const SHADCN_DEFAULT_UTILS = pick<string>("defaultUtils", "string");

export const SHADCN_VERSION = shadcnVersion;
