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
var ROOT = "~/.agents";
function AgentsPanel() {
  const [visible, setVisible] = (0, import_react.useState)(isOpen());
  (0, import_react.useEffect)(() => on(() => setVisible(isOpen())), []);
  if (!visible) return null;
  return /* @__PURE__ */ import_react.default.createElement("div", { style: styles.overlay }, /* @__PURE__ */ import_react.default.createElement("div", { style: styles.head }, /* @__PURE__ */ import_react.default.createElement("b", { style: { color: "#fff" } }, "\u516C\u5171\u4ED3\u5E93 \xB7 ~/.agents"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: toggle, style: styles.closeBtn }, "\xD7")), /* @__PURE__ */ import_react.default.createElement(RepoTree, null));
}
function PublicRepoButton() {
  return /* @__PURE__ */ import_react.default.createElement("button", { onClick: toggle, style: styles.footBtn }, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: 13 } }, "\u{1F4C2}"), /* @__PURE__ */ import_react.default.createElement("span", null, "\u516C\u5171\u4ED3\u5E93"));
}
function RepoTree() {
  const [dir, setDir] = (0, import_react.useState)(ROOT);
  const [data, setData] = (0, import_react.useState)(null);
  const [err, setErr] = (0, import_react.useState)("");
  const [sel, setSel] = (0, import_react.useState)(null);
  const [draft, setDraft] = (0, import_react.useState)("");
  const load = (0, import_react.useCallback)(async (d) => {
    setErr("");
    setSel(null);
    try {
      const r = await fetch(`/agents/list?dir=${encodeURIComponent(d)}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "list failed");
      setData(j);
      setDir(j.dir);
    } catch (e) {
      setErr(String(e && e.message || e));
    }
  }, []);
  (0, import_react.useEffect)(() => {
    void load(dir);
  }, []);
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
    void load(parent || ROOT);
  };
  return /* @__PURE__ */ import_react.default.createElement("div", { style: styles.body }, /* @__PURE__ */ import_react.default.createElement("div", { style: styles.toolbar }, /* @__PURE__ */ import_react.default.createElement("button", { onClick: up, style: styles.tbBtn }, "\u2B06 \u4E0A\u7EA7"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: makeFile, style: styles.tbBtn }, "\uFF0B \u65B0\u5EFA"), /* @__PURE__ */ import_react.default.createElement("span", { style: styles.crumb }, dir)), err && /* @__PURE__ */ import_react.default.createElement("div", { style: { color: "#f66", fontSize: 12, padding: 8 } }, err), /* @__PURE__ */ import_react.default.createElement("div", { style: styles.tree }, data?.dirs.map((d) => /* @__PURE__ */ import_react.default.createElement("div", { key: d.path, style: styles.row, onClick: () => load(d.path) }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u{1F4C1}"), " ", /* @__PURE__ */ import_react.default.createElement("span", null, d.name, "/"))), data?.files.map((f) => /* @__PURE__ */ import_react.default.createElement("div", { key: f.path, style: styles.row, onClick: () => open2(f.path) }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u{1F4C4}"), " ", /* @__PURE__ */ import_react.default.createElement("span", null, f.name)))), sel && /* @__PURE__ */ import_react.default.createElement("div", { style: styles.preview }, /* @__PURE__ */ import_react.default.createElement("div", { style: styles.previewHead }, /* @__PURE__ */ import_react.default.createElement("span", null, sel.path), /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => remove(sel.path), style: { color: "#f66" } }, "\u5220\u9664"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: save, style: { color: "#3a6" } }, "\u4FDD\u5B58")), /* @__PURE__ */ import_react.default.createElement(
    "textarea",
    {
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      style: styles.textarea
    }
  )));
}
var styles = {
  overlay: {
    position: "fixed",
    top: 0,
    right: 0,
    height: "100vh",
    width: 340,
    background: "#111a2e",
    color: "#dfe6f5",
    zIndex: 1e5,
    borderLeft: "1px solid #2a3550",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 0 30px rgba(0,0,0,.4)"
  },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderBottom: "1px solid #26314c",
    flexShrink: 0
  },
  closeBtn: { background: "transparent", color: "#8b99ad", fontSize: 20, lineHeight: 1, border: "none", cursor: "pointer" },
  body: { flex: 1, overflow: "auto", padding: "10px 12px", fontSize: 12.5 },
  toolbar: { display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" },
  tbBtn: { background: "#223052", color: "#dfe6f5", border: "1px solid #33456d", borderRadius: 6, padding: "3px 8px", fontSize: 12, cursor: "pointer" },
  crumb: { color: "#8b99ad", fontSize: 11.5, wordBreak: "break-all" },
  tree: { display: "flex", flexDirection: "column", gap: 2 },
  row: { display: "flex", gap: 6, alignItems: "center", padding: "4px 6px", borderRadius: 6, cursor: "pointer" },
  preview: { marginTop: 10, border: "1px solid #33456d", borderRadius: 8, overflow: "hidden" },
  previewHead: { display: "flex", gap: 10, alignItems: "center", padding: "6px 10px", background: "#1c2740", fontSize: 11.5 },
  textarea: { width: "100%", minHeight: 220, background: "#0d1425", color: "#dfe6f5", border: "none", outline: "none", padding: 8, fontSize: 12, fontFamily: "monospace", resize: "vertical" },
  footBtn: { display: "flex", alignItems: "center", gap: 8, width: "100%", background: "transparent", color: "#aab6d2", border: "none", padding: "9px 14px", cursor: "pointer", fontSize: 13 }
};

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
