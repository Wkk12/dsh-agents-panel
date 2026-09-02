// src/index.ts
import { promises as fs, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join, dirname, basename } from "node:path";
var AGENTS = join(homedir(), ".agents");
var RULES_DIR = join(AGENTS, "rules");
var WORKSPACES_FILE = join(AGENTS, "workspaces.json");
function syncDshWorkspacePaths() {
  try {
    const home = process.env.DSH_HOME || join(homedir(), ".dsh");
    const j = JSON.parse(readFileSync(join(home, "storages", "workspace.json"), "utf-8"));
    const t = j.tables && j.tables.workspaces || {};
    return Object.values(t).map((w) => w.path).filter(Boolean);
  } catch {
    return [];
  }
}
var DEFAULT_RULE_IDS = ["gen-engineering", "gen-discipline", "gen-restful", "gen-java", "gen-vue"];
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
async function generateProjectRules(ws, ids) {
  const library = await readRulesLibrary();
  const chosen = library.filter((r) => (ids || []).includes(r.id));
  const agPath = join(ws, "AGENTS.md");
  const content = `# \u9879\u76EE\u89C4\u5219(\u7531\u516C\u5171\u4ED3\u5E93\u300C\u89C4\u5219\u300D\u9875\u751F\u6210,\u542B\u901A\u7528+\u52FE\u9009\u89C4\u5219)

> \u5DE5\u4F5C\u533A\u6839\u76EE\u5F55: ${ws}
> \u5982\u9700\u8C03\u6574: DSH\u300C\u516C\u5171\u4ED3\u5E93\u2192\u89C4\u5219\u300D\u52FE\u9009\u4FDD\u5B58,\u6216 \`rule check/uncheck\`\u3002

---

` + chosen.map((r) => `## ${r.name}

${r.file}`).join("\n\n---\n\n") + "\n";
  await fs.writeFile(agPath, content, "utf-8");
  const cl = join(ws, "CLAUDE.md");
  try {
    const st = await fs.lstat(cl);
    if (st.isSymbolicLink()) await fs.unlink(cl);
  } catch {
  }
  try {
    const existing = await fs.readFile(cl, "utf-8").catch(() => "");
    if (!existing.trimStart().startsWith("@AGENTS.md")) await fs.writeFile(cl, "@AGENTS.md\n\n" + existing, "utf-8");
  } catch {
  }
}
async function bootstrapWorkspace(ws) {
  const hasAg = await fs.access(join(ws, "AGENTS.md")).then(() => true).catch(() => false);
  const hasCl = await fs.access(join(ws, "CLAUDE.md")).then(() => true).catch(() => false);
  if (hasAg || hasCl) return { ok: true, skipped: true, path: ws, count: 0 };
  const sels = await readSelections();
  const ids = sels[ws] && sels[ws].length ? sels[ws] : DEFAULT_RULE_IDS.slice();
  await generateProjectRules(ws, ids);
  return { ok: true, skipped: false, path: ws, count: ids.length };
}
function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({
      kind: "prefix",
      path: "/agents",
      handler: async (req, res) => {
        const u = new URL(req.url ?? "/", "http://x");
        const name = u.pathname.slice("/agents".length);
        const q2 = u.searchParams;
        try {
          if (name === "/list") {
            const target = targetDir(q2.get("dir"));
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
            const p = q2.get("path");
            if (!p) return send(res, { ok: false, error: "no path" });
            return send(res, { ok: true, path: p, content: await fs.readFile(p, "utf-8") });
          }
          if (name === "/write") {
            const p = q2.get("path");
            const content = q2.get("content") ?? "";
            if (!p) return send(res, { ok: false, error: "no path" });
            await fs.mkdir(dirname(p), { recursive: true });
            await fs.writeFile(p, content, "utf-8");
            return send(res, { ok: true });
          }
          if (name === "/delete") {
            const p = q2.get("path");
            if (!p) return send(res, { ok: false, error: "no path" });
            await fs.unlink(p);
            return send(res, { ok: true });
          }
          if (name === "/open") {
            const p = q2.get("path");
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
            return send(res, { ok: true, rules, selections, defaultRules: DEFAULT_RULE_IDS });
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
            let wroteLocal = true, agPath = join(ws, "AGENTS.md");
            try {
              await generateProjectRules(ws, sels[ws] || []);
            } catch {
              wroteLocal = false;
            }
            return send(res, { ok: true, wroteLocal, localPath: agPath });
          }
          if (name === "/bootstrap") {
            const ws = q.get("ws");
            if (ws) {
              const r = await bootstrapWorkspace(ws);
              return send(res, { ok: true, ...r });
            }
            const dsh = await readDshWorkspaces();
            const sels = await readSelections();
            const seen = /* @__PURE__ */ new Set();
            const all = [];
            for (const w of dsh) {
              seen.add(w.path);
              all.push(w.path);
            }
            for (const p of Object.keys(sels)) if (!seen.has(p)) {
              seen.add(p);
              all.push(p);
            }
            const done = [];
            for (const p of all) {
              done.push(await bootstrapWorkspace(p).catch((e) => ({ path: p, skipped: false })));
            }
            const built = done.filter((d) => !d.skipped);
            return send(res, { ok: true, total: all.length, bootstrapped: built.length, skipped: done.length - built.length, items: done });
          }
          return send(res, { ok: false, error: "not found" }, 404);
        } catch (e) {
          return send(res, { ok: false, error: String(e && e.message || e) }, 500);
        }
      }
    }),
    "dsh-agents-panel: rules routes"
  );
  ctx.effect(
    () => {
      const seen = /* @__PURE__ */ new Set();
      const scan = async () => {
        const dsh = await readDshWorkspaces().catch(() => []);
        const sels = await readSelections();
        const all = [...dsh.map((w) => w.path), ...Object.keys(sels)];
        for (const p of all) {
          if (seen.has(p)) continue;
          seen.add(p);
          try {
            await bootstrapWorkspace(p);
          } catch {
          }
        }
      };
      for (const p of syncDshWorkspacePaths()) seen.add(p);
      const off = typeof ctx.on === "function" ? ctx.on("domain/changed", (change) => {
        if (change && change.domain === "workspace") void scan();
      }) : null;
      return () => {
        if (typeof off === "function") off();
      };
    },
    "dsh-agents-panel: auto-bootstrap"
  );
}
export {
  apply,
  inject
};
