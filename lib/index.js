// src/index.ts
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
var ROOT = join(homedir(), ".agents");
var inject = ["webServer"];
function send(res, body, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json;charset=utf-8" });
  res.end(JSON.stringify(body));
}
function targetDir(dir) {
  if (!dir || dir === "~" || dir === "~/.agents" || dir === ROOT) return ROOT;
  return dir;
}
function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({
      kind: "prefix",
      path: "/agents",
      handler: async (req, res) => {
        const u = new URL(req.url ?? "/", "http://x");
        const name = u.pathname.slice("/agents".length);
        const q = u.searchParams;
        try {
          if (name === "/list") {
            const target = targetDir(q.get("dir"));
            const ents = await fs.readdir(target, { withFileTypes: true });
            const dirs = [];
            const files = [];
            for (const e of ents) {
              const item = { name: e.name, type: e.isDirectory() ? "directory" : "file", path: join(target, e.name) };
              (e.isDirectory() ? dirs : files).push(item);
            }
            dirs.sort((a, b) => a.name.localeCompare(b.name));
            files.sort((a, b) => a.name.localeCompare(b.name));
            return send(res, { ok: true, dir: target, dirs, files });
          }
          if (name === "/read") {
            const p = q.get("path");
            if (!p) return send(res, { ok: false, error: "no path" });
            const content = await fs.readFile(p, "utf-8");
            return send(res, { ok: true, path: p, content });
          }
          if (name === "/write") {
            const p = q.get("path");
            const content = q.get("content") ?? "";
            if (!p) return send(res, { ok: false, error: "no path" });
            await fs.mkdir(dirname(p), { recursive: true });
            await fs.writeFile(p, content, "utf-8");
            return send(res, { ok: true });
          }
          if (name === "/delete") {
            const p = q.get("path");
            if (!p) return send(res, { ok: false, error: "no path" });
            await fs.unlink(p);
            return send(res, { ok: true });
          }
          return send(res, { ok: false, error: "not found" }, 404);
        } catch (e) {
          return send(res, { ok: false, error: String(e && e.message || e) }, 500);
        }
      }
    }),
    "dsh-agents-panel: routes"
  );
}
export {
  apply,
  inject
};
