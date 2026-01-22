import { build } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ["mv2", "mv3"];

process.chdir(root);

const writeManifest = async (target) => {
  const manifestPath = path.resolve(root, "manifests", `manifest.${target}.json`);
  const outDir = path.resolve(root, "dist", target);
  const raw = await readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(raw);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
};

for (const target of targets) {
  process.env.EXT_TARGET = target;
  await build({
    configFile: path.resolve(root, "vite.config.ts"),
    mode: target,
  });
  await writeManifest(target);
}
