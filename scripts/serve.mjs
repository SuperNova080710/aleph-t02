import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve(".");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".md": "text/plain; charset=utf-8",
};
http
  .createServer(async (req, res) => {
    try {
      const path = resolve(
        root,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
      if (!path.startsWith(root + "/") && path !== root) throw Error();
      const target = path === root ? root + "/index.html" : path;
      res.setHeader(
        "Content-Type",
        types[extname(target)] || "application/octet-stream",
      );
      res.end(await readFile(target));
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  })
  .listen(Number(process.env.PORT || 4173), "127.0.0.1", () =>
    console.log("http://127.0.0.1:" + (process.env.PORT || 4173)),
  );
