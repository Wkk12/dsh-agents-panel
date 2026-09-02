// Host 半部：供「公共仓库」面板使用的接口
// - /agents/*   : 读取/编辑 ~/.agents 文件(技能/规则/MCP)
// - /rules/*    : 规则库分类 + 按工作区根目录勾选 + 生成 CLAUDE.local.md
// 用 node fs + os.homedir() 直接读写主目录与工作区(宿主进程以用户权限运行)。
import { promises as fs, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join, dirname, basename } from 'node:path'

const AGENTS = join(homedir(), '.agents')
const RULES_DIR = join(AGENTS, 'rules')
const WORKSPACES_FILE = join(AGENTS, 'workspaces.json')

// 同步读 DSH 已登记工作区根目录(仅用于在插件加载时一次性标记 seen,避免误动旧工作区)
function syncDshWorkspacePaths(): string[] {
  try {
    const home = process.env.DSH_HOME || join(homedir(), '.dsh')
    const j = JSON.parse(readFileSync(join(home, 'storages', 'workspace.json'), 'utf-8'))
    const t = (j.tables && j.tables.workspaces) || {}
    return Object.values(t).map((w: any) => w.path).filter(Boolean)
  } catch { return [] }
}

// 新项目默认规则模板(通用核心;新工作区未勾选时预勾这组)
const DEFAULT_RULE_IDS = ['gen-engineering', 'gen-discipline', 'gen-restful', 'gen-java', 'gen-vue']

export const inject = ['webServer']

function send(res: any, body: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json;charset=utf-8' })
  res.end(JSON.stringify(body))
}
async function readJson(path: string, fallback: any) {
  try { return JSON.parse(await fs.readFile(path, 'utf-8')) } catch { return fallback }
}
function targetDir(dir: string | null): string {
  if (!dir || dir === '~' || dir === '~/.agents' || dir === AGENTS) return AGENTS
  return dir
}

// 读取规则库:遍历 ~/.agents/rules/**/*.md,解析 frontmatter(id/name/category/description)
type Rule = { id: string; name: string; category: string; applies: string; description: string; file: string }
async function readRulesLibrary(): Promise<Rule[]> {
  const out: Rule[] = []
  async function walk(d: string) {
    let ents = []
    try { ents = await fs.readdir(d, { withFileTypes: true }) } catch { return }
    for (const e of ents) {
      const p = join(d, e.name)
      if (e.isDirectory()) await walk(p)
      else if (e.isFile() && e.name.endsWith('.md')) {
        try {
          const txt = await fs.readFile(p, 'utf-8')
          const m = txt.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
          const fm: Record<string, string> = {}
          if (m) {
            for (const line of m[1].split('\n')) { const kv = line.match(/^([a-zA-Z-]+):\s*(.*)$/); if (kv) fm[kv[1]] = kv[2].trim() }
          }
          if (fm.id) out.push({ id: fm.id, name: fm.name || fm.id, category: fm.category || '未分类', applies: fm.applies || '', description: fm.description || '', file: m ? m[2].trim() : txt.trim() })
        } catch { /* skip */ }
      }
    }
  }
  await walk(RULES_DIR)
  return out
}
// 读选区:workspaces.json 的 workspaces 字段
async function readSelections(): Promise<Record<string, string[]>> {
  const j = await readJson(WORKSPACES_FILE, { workspaces: {} })
  return j.workspaces || {}
}
// 读 DSH 真实工作区列表($DSH_HOME/storages/workspace.json 的 tables.workspaces)
async function readDshWorkspaces(): Promise<{ path: string; title: string }[]> {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  const j = await readJson(join(home, 'storages', 'workspace.json'), { tables: { workspaces: {} } })
  const t = (j.tables && j.tables.workspaces) || {}
  return Object.values(t).map((w: any) => ({ path: w.path, title: w.title || basename(w.path) }))
}

// 生成本地规则文件:工作区根目录 AGENTS.md(跨工具标准)+ CLAUDE.md(@AGENTS.md 导入)
async function generateProjectRules(ws: string, ids: string[]): Promise<void> {
  const library = await readRulesLibrary()
  const chosen = library.filter((r) => (ids || []).includes(r.id))
  const agPath = join(ws, 'AGENTS.md')
  const content = `# 项目规则(由公共仓库「规则」页生成,含通用+勾选规则)\n\n> 工作区根目录: ${ws}\n> 如需调整: DSH「公共仓库→规则」勾选保存,或 \`rule check/uncheck\`。\n\n---\n\n` + chosen.map((r) => `## ${r.name}\n\n${r.file}`).join('\n\n---\n\n') + '\n'
  await fs.writeFile(agPath, content, 'utf-8')
  // 让 Claude Code 也读项目规则:CLAUDE.md 为实体文件,首行 @AGENTS.md 导入(Claude 记忆追加在此,不影响 AGENTS.md)
  const cl = join(ws, 'CLAUDE.md')
  try { const st = await fs.lstat(cl); if (st.isSymbolicLink()) await fs.unlink(cl) } catch { /* ignore */ }
  try {
    const existing = await fs.readFile(cl, 'utf-8').catch(() => '')
    if (!existing.trimStart().startsWith('@AGENTS.md')) await fs.writeFile(cl, '@AGENTS.md\n\n' + existing, 'utf-8')
  } catch { /* ignore */ }
}

// 为"还没有任何规则文件"的工作区套用默认模板(已有 AGENTS.md/CLAUDE.md 就不动,不覆盖手写的)
async function bootstrapWorkspace(ws: string): Promise<{ ok: boolean; skipped: boolean; path: string; count: number }> {
  const hasAg = await fs.access(join(ws, 'AGENTS.md')).then(() => true).catch(() => false)
  const hasCl = await fs.access(join(ws, 'CLAUDE.md')).then(() => true).catch(() => false)
  if (hasAg || hasCl) return { ok: true, skipped: true, path: ws, count: 0 }
  const sels = await readSelections()
  const ids = sels[ws] && sels[ws].length ? sels[ws] : DEFAULT_RULE_IDS.slice()
  await generateProjectRules(ws, ids)
  return { ok: true, skipped: false, path: ws, count: ids.length }
}

export function apply(ctx: any) {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'prefix',
      path: '/agents',
      handler: async (req: any, res: any) => {
        const u = new URL(req.url ?? '/', 'http://x')
        const name = u.pathname.slice('/agents'.length)
        const q = u.searchParams
        try {
          if (name === '/list') {
            const target = targetDir(q.get('dir'))
            const ents = await fs.readdir(target, { withFileTypes: true })
            const dirs: any[] = [], files: any[] = []
            for (const e of ents) {
              // 软链(isSymbolicLink)的 isDirectory() 恒为 false,需 stat 其真实类型
              let isDir = e.isDirectory()
              if (e.isSymbolicLink()) {
                try { isDir = (await fs.stat(join(target, e.name))).isDirectory() } catch { /* 忽略,按文件 */ }
              }
              const item = { name: e.name, type: isDir ? 'directory' : 'file', path: join(target, e.name) }
              ;(isDir ? dirs : files).push(item)
            }
            dirs.sort((a, b) => a.name.localeCompare(b.name)); files.sort((a, b) => a.name.localeCompare(b.name))
            return send(res, { ok: true, dir: target, dirs, files })
          }
          if (name === '/read') {
            const p = q.get('path'); if (!p) return send(res, { ok: false, error: 'no path' })
            return send(res, { ok: true, path: p, content: await fs.readFile(p, 'utf-8') })
          }
          if (name === '/write') {
            const p = q.get('path'); const content = q.get('content') ?? ''
            if (!p) return send(res, { ok: false, error: 'no path' })
            await fs.mkdir(dirname(p), { recursive: true }); await fs.writeFile(p, content, 'utf-8')
            return send(res, { ok: true })
          }
          if (name === '/delete') {
            const p = q.get('path'); if (!p) return send(res, { ok: false, error: 'no path' })
            await fs.unlink(p); return send(res, { ok: true })
          }
          if (name === '/open') {
            // 在系统资源管理器打开目录/文件(macOS 用 `open`)
            const p = q.get('path')
            if (!p) return send(res, { ok: false, error: 'no path' })
            try { spawn('open', [p], { detached: true, stdio: 'ignore' }).unref(); return send(res, { ok: true }) } catch (e: any) { return send(res, { ok: false, error: String((e && e.message) || e) }, 500) }
          }
          return send(res, { ok: false, error: 'not found' }, 404)
        } catch (e: any) {
          return send(res, { ok: false, error: String((e && e.message) || e) }, 500)
        }
      },
    }),
    'dsh-agents-panel: agents routes',
  )

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'prefix',
      path: '/rules',
      handler: async (req: any, res: any) => {
        const u = new URL(req.url ?? '/', 'http://x')
        const name = u.pathname.slice('/rules'.length)
        try {
          if (name === '/library') {
            const rules = await readRulesLibrary()
            const selections = await readSelections()
            return send(res, { ok: true, rules, selections, defaultRules: DEFAULT_RULE_IDS })
          }
          if (name === '/workspaces') {
            const dsh = await readDshWorkspaces()
            const sels = await readSelections()
            // 合并 DSH 已存工作区 + 已配置工作区,按 path 去重
            const seen = new Set<string>()
            const all: { path: string; title: string }[] = []
            for (const w of dsh) { seen.add(w.path); all.push(w) }
            for (const p of Object.keys(sels)) { if (!seen.has(p)) { seen.add(p); all.push({ path: p, title: basename(p) }) } }
            return send(res, { ok: true, workspaces: all })
          }
          if (name === '/selections') {
            return send(res, { ok: true, selections: await readSelections() })
          }
          if (name === '/save') {
            // POST body:{ ws, rules:[id] }
            let body = ''
            for await (const c of req) body += c
            const { ws, rules } = JSON.parse(body || '{}')
            if (!ws) return send(res, { ok: false, error: 'no ws' })
            const sels = await readSelections()
            sels[ws] = Array.isArray(rules) ? rules : []
            await fs.writeFile(WORKSPACES_FILE, JSON.stringify({ workspaces: sels }, null, 2), 'utf-8')
            // 生成工作区根目录的 AGENTS.md(跨工具标准:DSH/Codex/Cursor 都读)
            let wroteLocal = true, agPath = join(ws, 'AGENTS.md')
            try { await generateProjectRules(ws, sels[ws] || []) } catch { wroteLocal = false }
            return send(res, { ok: true, wroteLocal, localPath: agPath })
          }
          if (name === '/bootstrap') {
            // 自动为新工作区补默认规则:?ws=<path> 单个;/rules/bootstrap 不带 ws = 补齐所有缺少规则文件的已登记工作区
            const ws = q.get('ws')
            if (ws) {
              const r = await bootstrapWorkspace(ws)
              return send(res, { ok: true, ...r })
            }
            const dsh = await readDshWorkspaces()
            const sels = await readSelections()
            const seen = new Set<string>()
            const all: string[] = []
            for (const w of dsh) { seen.add(w.path); all.push(w.path) }
            for (const p of Object.keys(sels)) if (!seen.has(p)) { seen.add(p); all.push(p) }
            const done: { path: string; skipped: boolean }[] = []
            for (const p of all) { done.push(await bootstrapWorkspace(p).catch((e) => ({ path: p, skipped: false }))) }
            const built = done.filter((d) => !d.skipped)
            return send(res, { ok: true, total: all.length, bootstrapped: built.length, skipped: done.length - built.length, items: done })
          }
          return send(res, { ok: false, error: 'not found' }, 404)
        } catch (e: any) {
          return send(res, { ok: false, error: String((e && e.message) || e) }, 500)
        }
      },
    }),
    'dsh-agents-panel: rules routes',
  )

  // 自动引导:新工作区(DSH 里新建/打开一个还没规则文件的目录)自动补默认规则,
  // 让"新建项目第一步就自动拿到公共规则"成立。已存在的旧工作区不进初始 seen,不会被自动改动。
  ctx.effect(
    () => {
      const seen = new Set<string>()
      const scan = async () => {
        const dsh = await readDshWorkspaces().catch(() => [])
        const sels = await readSelections()
        const all = [...dsh.map((w) => w.path), ...Object.keys(sels)]
        for (const p of all) {
          if (seen.has(p)) continue
          seen.add(p)
          try { await bootstrapWorkspace(p) } catch { /* 目录不存在/无权限,跳过 */ }
        }
      }
      // 初始:同步标记当前所有登记工作区,避免误动旧工作区;仅对之后新增的做引导
      for (const p of syncDshWorkspacePaths()) seen.add(p)
      // DSH 工作区域有变化(新建/打开新工作区)时,补引导缺失的规则文件
      const off = typeof ctx.on === 'function'
        ? ctx.on('domain/changed', (change: any) => { if (change && change.domain === 'workspace') void scan() })
        : null
      return () => { if (typeof off === 'function') off() }
    },
    'dsh-agents-panel: auto-bootstrap',
  )
}
