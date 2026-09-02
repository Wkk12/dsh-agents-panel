// src/index.ts
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join, dirname, basename } from "node:path";
var AGENTS = join(homedir(), ".agents");
var RULES_DIR = join(AGENTS, "rules");
var WORKSPACES_FILE = join(AGENTS, "workspaces.json");
var inject = ["webServer"];
function send(res, body, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json;charset=utf-8" });
  res.end(JSON.stringify(body));
}
async function readJson(path, fallback) {
  try {
    return JSON.parse(await fs.readFile(path, "utf-8"));
  } catch {
    return fallback;
  }
}
function targetDir(dir) {
  if (!dir || dir === "~" || dir === "~/.agents" || dir === AGENTS) return AGENTS;
  return dir;
}
async function readRulesLibrary() {
  const out = [];
  async function walk(d) {
    let ents = [];
    try {
      ents = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name.endsWith(".md")) {
        try {
          const txt = await fs.readFile(p, "utf-8");
          const m = txt.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
          const fm = {};
          if (m) {
            for (const line of m[1].split("\n")) {
              const kv = line.match(/^([a-zA-Z-]+):\s*(.*)$/);
              if (kv) fm[kv[1]] = kv[2].trim();
            }
          }
          if (fm.id) out.push({ id: fm.id, name: fm.name || fm.id, category: fm.category || "\u672A\u5206\u7C7B", applies: fm.applies || "", description: fm.description || "", file: m ? m[2].trim() : txt.trim() });
        } catch {
        }
      }
    }
  }
  await walk(RULES_DIR);
  return out;
}
async function readSelections() {
  const j = await readJson(WORKSPACES_FILE, { workspaces: {} });
  return j.workspaces || {};
}
async function readDshWorkspaces() {
  const home = process.env.DSH_HOME || join(homedir(), ".dsh");
  const j = await readJson(join(home, "storages", "workspace.json"), { tables: { workspaces: {} } });
  const t = j.tables && j.tables.workspaces || {};
  return Object.values(t).map((w) => ({ path: w.path, title: w.title || basename(w.path) }));
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
            const dirs = [], files = [];
            for (const e of ents) {
              let isDir = e.isDirectory();
              if (e.isSymbolicLink()) {
                try {
                  isDir = (await fs.stat(join(target, e.name))).isDirectory();
                } catch {
                }
              }
              const item = { name: e.name, type: isDir ? "directory" : "file", path: join(target, e.name) };
              (isDir ? dirs : files).push(item);
            }
            dirs.sort((a, b) => a.name.localeCompare(b.name));
            files.sort((a, b) => a.name.localeCompare(b.name));
            return send(res, { ok: true, dir: target, dirs, files });
          }
          if (name === "/read") {
            const p = q.get("path");
            if (!p) return send(res, { ok: false, error: "no path" });
            return send(res, { ok: true, path: p, content: await fs.readFile(p, "utf-8") });
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
          if (name === "/open") {
            const p = q.get("path");
            if (!p) return send(res, { ok: false, error: "no path" });
            try {
              spawn("open", [p], { detached: true, stdio: "ignore" }).unref();
              return send(res, { ok: true });
            } catch (e) {
              return send(res, { ok: false, error: String(e && e.message || e) }, 500);
            }
          }
          return send(res, { ok: false, error: "not found" }, 404);
        } catch (e) {
          return send(res, { ok: false, error: String(e && e.message || e) }, 500);
        }
      }
    }),
    "dsh-agents-panel: agents routes"
  );
  ctx.effect(
    () => ctx.webServer.register({
      kind: "prefix",
      path: "/rules",
      handler: async (req, res) => {
        const u = new URL(req.url ?? "/", "http://x");
        const name = u.pathname.slice("/rules".length);
        try {
          if (name === "/library") {
            const rules = await readRulesLibrary();
            const selections = await readSelections();
            return send(res, { ok: true, rules, selections });
          }
          if (name === "/workspaces") {
            const dsh = await readDshWorkspaces();
            const sels = await readSelections();
            const seen = /* @__PURE__ */ new Set();
            const all = [];
            for (const w of dsh) {
              seen.add(w.path);
              all.push(w);
            }
            for (const p of Object.keys(sels)) {
              if (!seen.has(p)) {
                seen.add(p);
                all.push({ path: p, title: basename(p) });
              }
            }
            return send(res, { ok: true, workspaces: all });
          }
          if (name === "/selections") {
            return send(res, { ok: true, selections: await readSelections() });
          }
          if (name === "/save") {
            let body = "";
            for await (const c of req) body += c;
            const { ws, rules } = JSON.parse(body || "{}");
            if (!ws) return send(res, { ok: false, error: "no ws" });
            const sels = await readSelections();
            sels[ws] = Array.isArray(rules) ? rules : [];
            await fs.writeFile(WORKSPACES_FILE, JSON.stringify({ workspaces: sels }, null, 2), "utf-8");
            const library = await readRulesLibrary();
            const chosen = library.filter((r) => (sels[ws] || []).includes(r.id));
            const localPath = join(ws, "CLAUDE.local.md");
            const content = `# \u89C4\u5219\u9009\u62E9(\u7531\u516C\u5171\u4ED3\u5E93\u300C\u89C4\u5219\u300D\u9875\u81EA\u52A8\u751F\u6210,\u8BF7\u52FF\u624B\u6539;gitignore)

> \u5DE5\u4F5C\u533A\u6839\u76EE\u5F55: ${ws}

---

` + chosen.map((r) => `## ${r.name}

${r.file}`).join("\n\n---\n\n") + "\n";
            let wroteLocal = true;
            try {
              await fs.writeFile(localPath, content, "utf-8");
            } catch {
              wroteLocal = false;
            }
            return send(res, { ok: true, wroteLocal, localPath });
          }
          return send(res, { ok: false, error: "not found" }, 404);
        } catch (e) {
          return send(res, { ok: false, error: String(e && e.message || e) }, 500);
        }
      }
    }),
    "dsh-agents-panel: rules routes"
  );
}
export {
  apply,
  inject
};
