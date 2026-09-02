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
function readTheme() {
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  const cs = (n, fb) => root.getPropertyValue(n).trim() || fb;
  return {
    surface: cs("--dsw-alias-bg-base", body.backgroundColor || "#1a1e2b"),
    fg: body.color || "#dfe6f5",
    border: cs("--dsw-alias-border-l3", "#333a4a"),
    muted: body.color ? "inherit" : "#8b99ad",
    hover: "rgba(128,128,128,.12)"
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
function AgentsPanel() {
  const [visible, setVisible] = (0, import_react.useState)(isOpen());
  (0, import_react.useEffect)(() => on(() => setVisible(isOpen())), []);
  const theme = useTheme();
  if (!visible) return null;
  return /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      style: { position: "fixed", inset: 0, zIndex: 2e5, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)" },
      onClick: (e) => {
        if (e.target === e.currentTarget) toggle();
      }
    },
    /* @__PURE__ */ import_react.default.createElement("div", { style: { width: 760, maxWidth: "92vw", height: "72vh", maxHeight: "88vh", background: theme.surface, color: theme.fg, border: `1px solid ${theme.border}`, borderRadius: 12, boxShadow: "0 24px 70px rgba(0,0,0,.45)", display: "flex", flexDirection: "column", overflow: "hidden" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0 } }, /* @__PURE__ */ import_react.default.createElement("b", null, "\u516C\u5171\u4ED3\u5E93 \xB7 ~/.agents"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: toggle, style: { background: "transparent", border: "none", color: theme.muted, fontSize: 22, lineHeight: 1, cursor: "pointer" } }, "\xD7")), /* @__PURE__ */ import_react.default.createElement(RepoTree, { theme }))
  );
}
function PublicRepoButton() {
  return /* @__PURE__ */ import_react.default.createElement("button", { onClick: toggle, style: { display: "flex", alignItems: "center", gap: 8, width: "100%", background: "transparent", color: "inherit", border: "none", padding: "9px 14px", cursor: "pointer", fontSize: 13 } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: 15 } }, "\u{1F4C2}"), /* @__PURE__ */ import_react.default.createElement("span", null, "\u516C\u5171\u4ED3\u5E93"));
}
function RepoTree({ theme }) {
  const [dir, setDir] = (0, import_react.useState)("");
  const [data, setData] = (0, import_react.useState)(null);
  const [err, setErr] = (0, import_react.useState)("");
  const [sel, setSel] = (0, import_react.useState)(null);
  const [draft, setDraft] = (0, import_react.useState)("");
  const load = (0, import_react.useCallback)(async (d) => {
    setErr("");
    setSel(null);
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
  const open2 = async (path) => {
    try {
      const r = await fetch(`/agents/read?path=${encodeURIComponent(path)}`);
      const j = await r.json();
      setSel({ path, content: j.content ?? "" });
      setDraft(j.content ?? "");
    } catch (e) {
      setErr(String(e && e.message || e));
    }
  };
  const remove = async (path) => {
    if (!window.confirm(`\u5220\u9664 ${path}\uFF1F`)) return;
    await fetch(`/agents/delete?path=${encodeURIComponent(path)}`);
    void load(dir);
  };
  const save = async () => {
    if (!sel) return;
    await fetch(`/agents/write?path=${encodeURIComponent(sel.path)}&content=${encodeURIComponent(draft)}`);
    window.alert("\u5DF2\u4FDD\u5B58");
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
    const parent = p.slice(0, p.lastIndexOf("/"));
    void load(parent || "");
  };
  const st = (s) => ({ ...s, color: theme.fg });
  return /* @__PURE__ */ import_react.default.createElement("div", { style: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0 } }, /* @__PURE__ */ import_react.default.createElement("button", { onClick: up, style: st({ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 6, padding: "3px 10px", fontSize: 12, cursor: "pointer" }) }, "\u2B06 \u4E0A\u7EA7"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: makeFile, style: st({ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 6, padding: "3px 10px", fontSize: 12, cursor: "pointer" }) }, "\uFF0B \u65B0\u5EFA"), /* @__PURE__ */ import_react.default.createElement("span", { style: { color: theme.muted, fontSize: 11.5, wordBreak: "break-all" } }, dir || "~/.agents")), /* @__PURE__ */ import_react.default.createElement("div", { style: { flex: 1, overflow: "auto", padding: "8px 12px", fontSize: 12.5 } }, err && /* @__PURE__ */ import_react.default.createElement("div", { style: { color: "#f66", padding: 8 } }, err), data?.dirs.map((d) => /* @__PURE__ */ import_react.default.createElement("div", { key: d.path, onClick: () => load(d.path), style: { display: "flex", gap: 6, alignItems: "center", padding: "4px 6px", borderRadius: 6, cursor: "pointer" }, onMouseEnter: (e) => e.currentTarget.style.background = theme.hover, onMouseLeave: (e) => e.currentTarget.style.background = "transparent" }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u{1F4C1}"), " ", /* @__PURE__ */ import_react.default.createElement("span", null, d.name, "/"))), data?.files.map((f) => /* @__PURE__ */ import_react.default.createElement("div", { key: f.path, onClick: () => open2(f.path), style: { display: "flex", gap: 6, alignItems: "center", padding: "4px 6px", borderRadius: 6, cursor: "pointer" }, onMouseEnter: (e) => e.currentTarget.style.background = theme.hover, onMouseLeave: (e) => e.currentTarget.style.background = "transparent" }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u{1F4C4}"), " ", /* @__PURE__ */ import_react.default.createElement("span", null, f.name)))), sel && /* @__PURE__ */ import_react.default.createElement("div", { style: { borderTop: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", height: "38%" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", padding: "6px 12px", fontSize: 11.5 } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { flex: 1, wordBreak: "break-all" } }, sel.path), /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => remove(sel.path), style: { background: "transparent", border: "none", color: "#f66", cursor: "pointer" } }, "\u5220\u9664"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: save, style: { background: "transparent", border: "none", color: "#3a6", cursor: "pointer" } }, "\u4FDD\u5B58")), /* @__PURE__ */ import_react.default.createElement("textarea", { value: draft, onChange: (e) => setDraft(e.target.value), style: { flex: 1, background: "transparent", color: theme.fg, border: "none", outline: "none", padding: "0 12px 12px", fontSize: 12, fontFamily: "monospace", resize: "none" } })));
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
