// Host 半部：供「公共仓库」面板使用的接口
// - /agents/*   : 读取/编辑 ~/.agents 文件(技能/规则/MCP)
// - /rules/*    : 规则库分类 + 按工作区根目录勾选 + 生成 CLAUDE.local.md
// 用 node fs + os.homedir() 直接读写主目录与工作区(宿主进程以用户权限运行)。
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname, basename } from 'node:path'

const AGENTS = join(homedir(), '.agents')
const RULES_DIR = join(AGENTS, 'rules')
const WORKSPACES_FILE = join(AGENTS, 'workspaces.json')

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
            return send(res, { ok: true, rules, selections })
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
            // 生成该工作区根目录的 CLAUDE.local.md(gitignore,内容为勾选规则)
            const library = await readRulesLibrary()
            const chosen = library.filter((r) => (sels[ws] || []).includes(r.id))
            const localPath = join(ws, 'CLAUDE.local.md')
            const content = `# 规则选择(由公共仓库「规则」页自动生成,请勿手改;gitignore)\n\n> 工作区根目录: ${ws}\n\n---\n\n` + chosen.map((r) => `## ${r.name}\n\n${r.file}`).join('\n\n---\n\n') + '\n'
            let wroteLocal = true
            try { await fs.writeFile(localPath, content, 'utf-8') } catch { wroteLocal = false }
            return send(res, { ok: true, wroteLocal, localPath })
          }
          return send(res, { ok: false, error: 'not found' }, 404)
        } catch (e: any) {
          return send(res, { ok: false, error: String((e && e.message) || e) }, 500)
        }
      },
    }),
    'dsh-agents-panel: rules routes',
  )
}
