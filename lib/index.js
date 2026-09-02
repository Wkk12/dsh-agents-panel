// src/index.ts
import { promises as fs } from "node:fs";
var inject = ["webServer", "fs"];
function send(res, body, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json;charset=utf-8" });
  res.end(JSON.stringify(body));
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
            const dir = q.get("dir") || "~/.agents";
            const target = await ctx.fs.resolve(dir);
            const entries = await ctx.fs.listDir(target);
            const dirs = [];
            const files = [];
            for (const e of entries) {
              const item = { name: e.name, type: e.type, path: ctx.fs.processPath(e.target) };
              (e.type === "directory" ? dirs : files).push(item);
            }
            dirs.sort((a, b) => a.name.localeCompare(b.name));
            files.sort((a, b) => a.name.localeCompare(b.name));
            return send(res, { ok: true, dir: ctx.fs.processPath(target), dirs, files });
          }
          if (name === "/read") {
            const path = q.get("path");
            if (!path) return send(res, { ok: false, error: "no path" });
            const target = await ctx.fs.resolve(path);
            const content = await ctx.fs.readText(target);
            return send(res, { ok: true, path, content });
          }
          if (name === "/write") {
            const path = q.get("path");
            const content = q.get("content") ?? "";
            if (!path) return send(res, { ok: false, error: "no path" });
            const target = await ctx.fs.resolve(path);
            await fs.writeFile(target, content, "utf-8");
            return send(res, { ok: true });
          }
          if (name === "/delete") {
            const path = q.get("path");
            if (!path) return send(res, { ok: false, error: "no path" });
            await fs.unlink(path);
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
