import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", process.env.E2E_DIST_ROOT ?? "dist/mv2");
const port = Number(process.env.E2E_PORT ?? 4173);

const contentTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    const relativePath = pathname === "/" ? "/popup/index.html" : pathname;
    const filePath = path.join(root, relativePath);
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    const contentType = contentTypes[ext] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(port, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`E2E server running at http://127.0.0.1:${port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
