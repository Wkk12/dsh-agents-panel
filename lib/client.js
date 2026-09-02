window.__ModuleLoader__.load({ id: "dsh-agents-panel", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react2 = __toESM(require("react"), 1);

// src/client/AgentsPanel.tsx
var import_react = __toESM(require("react"), 1);
var import_react_dom = require("react-dom");

// src/client/store.ts
var open = false;
var listeners = /* @__PURE__ */ new Set();
function isOpen() {
  return open;
}
function toggle() {
  open = !open;
  listeners.forEach((l) => l());
}
function on(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// src/client/AgentsPanel.tsx
var P = { bg: "#0F172A", fg: "#F8FAFC", border: "#475569", accent: "#22C55E", dest: "#EF4444" };
function readTheme() {
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  const v = (n, fb) => root.getPropertyValue(n).trim() || fb;
  return {
    surface: v("--dsw-alias-bg-base", body.backgroundColor || P.bg),
    fg: body.color || P.fg,
    border: v("--dsw-alias-border-l3", P.border),
    accent: P.accent,
    dest: P.dest
  };
}
function useTheme() {
  const [t, setT] = (0, import_react.useState)(() => readTheme());
  (0, import_react.useEffect)(() => {
    const update = () => setT(readTheme());
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
    return () => mo.disconnect();
  }, []);
  return t;
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inline(s) {
  return s.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let html = "", inCode = false, code = "", list = "";
  for (const line of lines) {
    if (inCode) {
      if (line.trim().startsWith("```")) {
        html += "<pre><code>" + esc(code) + "</code></pre>";
        inCode = false;
        code = "";
      } else code += line + "\n";
      continue;
    }
    if (line.trim().startsWith("```")) {
      inCode = true;
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)/);
    if (h) {
      html += `<h${h[1].length}>${inline(esc(h[2]))}</h${h[1].length}>`;
      continue;
    }
    const li = line.match(/^([-*])\s+(.*)/);
    if (li) {
      if (list !== "ul") {
        if (list) html += `</${list}>`;
        list = "ul";
        html += "<ul>";
      }
      html += `<li>${inline(esc(li[2]))}</li>`;
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (list !== "ol") {
        if (list) html += `</${list}>`;
        list = "ol";
        html += "<ol>";
      }
      html += `<li>${inline(esc(line.replace(/^\d+\.\s+/, "")))}</li>`;
      continue;
    }
    if (list) {
      html += `</${list}>`;
      list = "";
    }
    if (line.trim() === "") continue;
    if (line.trim() === "---") {
      html += "<hr>";
      continue;
    }
    if (line.startsWith("> ")) {
      html += `<blockquote>${inline(esc(line.slice(2)))}</blockquote>`;
      continue;
    }
    html += `<p>${inline(esc(line))}</p>`;
  }
  if (inCode) html += "<pre><code>" + esc(code) + "</code></pre>";
  if (list) html += `</${list}>`;
  return html;
}
var Icon = ({ d, size = 14, fill = "none" }) => /* @__PURE__ */ import_react.default.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill, stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", style: { flexShrink: 0 } }, /* @__PURE__ */ import_react.default.createElement("path", { d }));
var IC = {
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6",
  up: "M12 19V5 M5 12l7-7 7 7",
  plus: "M12 5v14M5 12h14",
  x: "M18 6L6 18M6 6l12 12",
  eyes: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
};
function AgentsPanel() {
  const [visible, setVisible] = (0, import_react.useState)(isOpen());
  (0, import_react.useEffect)(() => on(() => setVisible(isOpen())), []);
  const theme = useTheme();
  if (!visible) return null;
  const modal = /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      style: { position: "fixed", inset: 0, zIndex: 2147483e3, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)" },
      onClick: (e) => {
        if (e.target === e.currentTarget) toggle();
      }
    },
    /* @__PURE__ */ import_react.default.createElement("style", null, `
        .ap-md h1,.ap-md h2,.ap-md h3{font-weight:600;margin:14px 0 8px;line-height:1.35}
        .ap-md h1{font-size:20px}.ap-md h2{font-size:17px}.ap-md h3{font-size:15px}
        .ap-md p{margin:8px 0;line-height:1.7}
        .ap-md code{font-family:SF Mono,Menlo,Consolas,monospace;font-size:12px;padding:1px 5px;border-radius:4px;background:rgba(128,128,128,.16)}
        .ap-md pre{background:rgba(0,0,0,.18);border:1px solid ${theme.border};border-radius:8px;padding:10px 12px;overflow:auto;margin:10px 0}
        .ap-md pre code{background:transparent;padding:0;display:block;line-height:1.6}
        .ap-md ul,.ap-md ol{margin:8px 0 8px 22px}
        .ap-md li{margin:3px 0;line-height:1.6}
        .ap-md blockquote{border-left:3px solid ${theme.accent};margin:8px 0;padding:2px 12px;opacity:.85}
        .ap-md a{color:${theme.accent}}
        .ap-md hr{border:none;border-top:1px solid ${theme.border};margin:12px 0}
      `),
    /* @__PURE__ */ import_react.default.createElement("div", { style: { width: 1020, maxWidth: "95vw", height: "86vh", maxHeight: "93vh", background: theme.surface, color: theme.fg, border: `1px solid ${theme.border}`, borderRadius: 12, boxShadow: "0 24px 80px rgba(0,0,0,.5)", display: "flex", flexDirection: "column", overflow: "hidden" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ import_react.default.createElement(Icon, { d: IC.folder, size: 16 }), /* @__PURE__ */ import_react.default.createElement("b", { style: { fontSize: 14, letterSpacing: ".3px" } }, "\u516C\u5171\u4ED3\u5E93 \xB7 ~/.agents")), /* @__PURE__ */ import_react.default.createElement("button", { onClick: toggle, "aria-label": "\u5173\u95ED", style: { background: "transparent", border: "none", color: theme.fg, opacity: 0.7, width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background .15s" }, onMouseEnter: (e) => e.currentTarget.style.background = "rgba(128,128,128,.18)", onMouseLeave: (e) => e.currentTarget.style.background = "transparent" }, /* @__PURE__ */ import_react.default.createElement(Icon, { d: IC.x, size: 18 }))), /* @__PURE__ */ import_react.default.createElement(RepoTree, { theme }))
  );
  return (0, import_react_dom.createPortal)(modal, document.body);
}
function PublicRepoButton() {
  return /* @__PURE__ */ import_react.default.createElement("button", { onClick: toggle, style: { display: "flex", alignItems: "center", gap: 9, width: "100%", background: "transparent", color: "inherit", border: "none", padding: "9px 14px", cursor: "pointer", fontSize: 13, borderRadius: 8 } }, /* @__PURE__ */ import_react.default.createElement(Icon, { d: IC.folder, size: 15 }), /* @__PURE__ */ import_react.default.createElement("span", null, "\u516C\u5171\u4ED3\u5E93"));
}
function RepoTree({ theme }) {
  const [dir, setDir] = (0, import_react.useState)("");
  const [data, setData] = (0, import_react.useState)(null);
  const [err, setErr] = (0, import_react.useState)("");
  const [tabs, setTabs] = (0, import_react.useState)([]);
  const [active, setActive] = (0, import_react.useState)(-1);
  const [draft, setDraft] = (0, import_react.useState)("");
  const [mode, setMode] = (0, import_react.useState)("preview");
  const load = (0, import_react.useCallback)(async (d) => {
    setErr("");
    try {
      const url = `/agents/list` + (d && d !== "~/.agents" ? `?dir=${encodeURIComponent(d)}` : "");
      const r = await fetch(url);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "list failed");
      setData(j);
      setDir(j.dir);
    } catch (e) {
      setErr(String(e && e.message || e));
    }
  }, []);
  (0, import_react.useEffect)(() => {
    void load("");
  }, [load]);
  const openFile = async (path) => {
    const idx = tabs.findIndex((t2) => t2.path === path);
    if (idx >= 0) {
      setActive(idx);
      setDraft(tabs[idx].content);
      setMode(tabs[idx].name.endsWith(".md") ? "preview" : "source");
      return;
    }
    try {
      const r = await fetch(`/agents/read?path=${encodeURIComponent(path)}`);
      const j = await r.json();
      const name = path.split("/").pop() || path;
      const tab = { path, name, content: j.content ?? "" };
      setTabs((ts) => [...ts, tab]);
      setActive(tabs.length);
      setDraft(tab.content);
      setMode(name.endsWith(".md") ? "preview" : "source");
    } catch (e) {
      setErr(String(e && e.message || e));
    }
  };
  const closeTab = (i) => {
    setTabs((ts) => ts.filter((_, k) => k !== i));
    setActive((a) => a === i ? -1 : a > i ? a - 1 : a);
  };
  const save = async () => {
    const t2 = tabs[active];
    if (!t2) return;
    await fetch(`/agents/write?path=${encodeURIComponent(t2.path)}&content=${encodeURIComponent(draft)}`);
    setTabs((ts) => ts.map((x, k) => k === active ? { ...x, content: draft } : x));
    window.alert("\u5DF2\u4FDD\u5B58");
  };
  const remove = async (i) => {
    const t2 = tabs[i];
    if (!t2) return;
    if (!window.confirm(`\u5220\u9664 ${t2.path}\uFF1F`)) return;
    await fetch(`/agents/delete?path=${encodeURIComponent(t2.path)}`);
    closeTab(i);
    void load(dir);
  };
  const makeFile = async () => {
    const name = window.prompt("\u65B0\u6587\u4EF6\u540D\uFF08\u5982 tools/hello.md\uFF0C\u76F8\u5BF9\u5F53\u524D\u76EE\u5F55\uFF09");
    if (!name) return;
    const full = `${dir.replace(/\/$/, "")}/${name.replace(/^\//, "")}`;
    await fetch(`/agents/write?path=${encodeURIComponent(full)}&content=`);
    void load(dir);
  };
  const up = () => {
    const p = dir.replace(/\/$/, "");
    void load(p.slice(0, p.lastIndexOf("/")) || "");
  };
  const t = tabs[active];
  const isMd = !!t && t.name.endsWith(".md");
  const hover = "rgba(128,128,128,.14)";
  const row = { display: "flex", gap: 7, alignItems: "center", padding: "4px 6px", borderRadius: 6, cursor: "pointer", fontSize: 12.5, transition: "background .15s" };
  return /* @__PURE__ */ import_react.default.createElement("div", { style: { flex: 1, display: "flex", minHeight: 0 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { width: 280, flexShrink: 0, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", minHeight: 0 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", padding: "9px 12px", flexShrink: 0 } }, /* @__PURE__ */ import_react.default.createElement("button", { onClick: up, style: { background: "transparent", color: theme.fg, border: `1px solid ${theme.border}`, borderRadius: 7, padding: "4px 10px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "background .15s" }, onMouseEnter: (e) => e.currentTarget.style.background = hover, onMouseLeave: (e) => e.currentTarget.style.background = "transparent" }, /* @__PURE__ */ import_react.default.createElement(Icon, { d: IC.up, size: 13 }), " \u4E0A\u7EA7"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: makeFile, style: { background: "transparent", color: theme.fg, border: `1px solid ${theme.border}`, borderRadius: 7, padding: "4px 10px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "background .15s" }, onMouseEnter: (e) => e.currentTarget.style.background = hover, onMouseLeave: (e) => e.currentTarget.style.background = "transparent" }, /* @__PURE__ */ import_react.default.createElement(Icon, { d: IC.plus, size: 13 }), " \u65B0\u5EFA")), /* @__PURE__ */ import_react.default.createElement("div", { style: { padding: "0 8px 6px", fontSize: 11, color: theme.fg, opacity: 0.55, wordBreak: "break-all" } }, dir || "~/.agents"), /* @__PURE__ */ import_react.default.createElement("div", { style: { flex: 1, overflow: "auto", padding: "0 8px 10px" } }, err && /* @__PURE__ */ import_react.default.createElement("div", { style: { color: theme.dest, padding: 8, fontSize: 12 } }, err), data?.dirs.map((d) => /* @__PURE__ */ import_react.default.createElement("div", { key: d.path, onClick: () => load(d.path), style: { ...row, color: theme.fg }, onMouseEnter: (e) => e.currentTarget.style.background = hover, onMouseLeave: (e) => e.currentTarget.style.background = "transparent" }, /* @__PURE__ */ import_react.default.createElement(Icon, { d: IC.folder, size: 14 }), " ", /* @__PURE__ */ import_react.default.createElement("span", null, d.name, "/"))), data?.files.map((f) => /* @__PURE__ */ import_react.default.createElement("div", { key: f.path, onClick: () => openFile(f.path), style: { ...row, color: theme.fg }, onMouseEnter: (e) => e.currentTarget.style.background = hover, onMouseLeave: (e) => e.currentTarget.style.background = "transparent" }, /* @__PURE__ */ import_react.default.createElement(Icon, { d: IC.file, size: 14 }), " ", /* @__PURE__ */ import_react.default.createElement("span", null, f.name))))), /* @__PURE__ */ import_react.default.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 } }, tabs.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: theme.fg, opacity: 0.5, fontSize: 13 } }, "\u70B9\u51FB\u5DE6\u4FA7\u6587\u4EF6\u4EE5\u6253\u5F00\u9884\u89C8") : /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderBottom: `1px solid ${theme.border}`, overflowX: "auto", flexShrink: 0 } }, tabs.map((x, i) => /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      key: x.path,
      onClick: () => {
        setActive(i);
        setDraft(x.content);
        setMode(x.name.endsWith(".md") ? "preview" : "source");
      },
      style: { display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer", background: i === active ? "rgba(128,128,128,.16)" : "transparent", color: theme.fg, whiteSpace: "nowrap", border: `1px solid ${i === active ? theme.accent : "transparent"}`, transition: "background .15s" }
    },
    /* @__PURE__ */ import_react.default.createElement("span", null, x.name),
    /* @__PURE__ */ import_react.default.createElement("button", { onClick: (e) => {
      e.stopPropagation();
      closeTab(i);
    }, "aria-label": "\u5173\u95ED", style: { background: "transparent", border: "none", color: "inherit", opacity: 0.6, cursor: "pointer", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ import_react.default.createElement(Icon, { d: IC.x, size: 12 }))
  ))), /* @__PURE__ */ import_react.default.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", padding: "6px 12px", fontSize: 11.5, color: theme.fg, opacity: 0.7, flexShrink: 0 } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { flex: 1, wordBreak: "break-all" } }, t?.path), isMd && /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => setMode(mode === "preview" ? "source" : "preview"), style: { background: "transparent", border: "none", color: theme.accent, cursor: "pointer" } }, mode === "preview" ? "\u7F16\u8F91\u6E90\u7801" : "\u9884\u89C8"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => remove(active), style: { background: "transparent", border: "none", color: theme.dest, cursor: "pointer" } }, "\u5220\u9664"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: save, style: { background: "transparent", border: "none", color: theme.accent, cursor: "pointer" } }, "\u4FDD\u5B58")), isMd && mode === "preview" ? /* @__PURE__ */ import_react.default.createElement("div", { className: "ap-md", style: { flex: 1, minHeight: 0, overflow: "auto", padding: "0 14px 14px", fontSize: 13 }, dangerouslySetInnerHTML: { __html: renderMarkdown(draft) } }) : /* @__PURE__ */ import_react.default.createElement(
    "textarea",
    {
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      spellCheck: false,
      style: { flex: 1, minHeight: 0, background: "transparent", color: theme.fg, border: "none", outline: "none", padding: "0 12px 12px", fontSize: 12.5, fontFamily: '"SF Mono","Menlo","Consolas",monospace', resize: "none", lineHeight: 1.6 }
    }
  )))));
}

// src/client/index.ts
var inject = ["slots"];
function apply(ctx) {
  ctx.slots.inject(
    "shell.overlay",
    () => ctx.slots.register(
      { name: "shell.overlay", id: "dsh-agents-panel", order: 100 },
      () => import_react2.default.createElement(AgentsPanel)
    )
  );
  ctx.slots.inject(
    "sidebar.footer.action",
    () => ctx.slots.register(
      { name: "sidebar.footer.action", id: "dsh-agents-panel", order: 100 },
      () => import_react2.default.createElement(PublicRepoButton)
    )
  );
}
return module.exports; } });
