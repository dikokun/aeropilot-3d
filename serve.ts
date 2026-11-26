import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const types: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg"
};
createServer(async (req, res) => {
  try {
    let p = (req.url || "/").split("?")[0];
    if (p === "/") p = "/index.html";
    const data = await readFile(join("game", p));
    res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("not found");
  }
}).listen(8085, () => console.log("aeropilot on :8085"));
