// Host 半部：提供 ~/.agents 文件树接口（列目录 / 读 / 写 / 删）
// 复用官方 ctx.fs（resolve/listDir/readText）+ node fs（写/删），
// 在 ctx.webServer 上注册 /agents 前缀路由，供 Browser 半部 fetch。
import { promises as fs } from 'node:fs'

export const inject = ['webServer', 'fs']

function send(res: any, body: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json;charset=utf-8' })
  res.end(JSON.stringify(body))
}

export function apply(ctx: any) {
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: '/agents',
        handler: async (req: any, res: any) => {
          const u = new URL(req.url ?? '/', 'http://x')
          const name = u.pathname.slice('/agents'.length)
          const q = u.searchParams
          try {
            // 列出目录：目录 + 文件分开，方便前端树形渲染
            if (name === '/list') {
              const dir = q.get('dir') || '~/.agents'
              const target = await ctx.fs.resolve(dir)
              const entries = await ctx.fs.listDir(target)
              const dirs: any[] = []
              const files: any[] = []
              for (const e of entries) {
                const item = { name: e.name, type: e.type, path: ctx.fs.processPath(e.target) }
                ;(e.type === 'directory' ? dirs : files).push(item)
              }
              dirs.sort((a, b) => a.name.localeCompare(b.name))
              files.sort((a, b) => a.name.localeCompare(b.name))
              return send(res, { ok: true, dir: ctx.fs.processPath(target), dirs, files })
            }
            // 读文本文件（用于预览 SKILL.md / AGENTS.md / servers.json）
            if (name === '/read') {
              const path = q.get('path')
              if (!path) return send(res, { ok: false, error: 'no path' })
              const target = await ctx.fs.resolve(path)
              const content = await ctx.fs.readText(target)
              return send(res, { ok: true, path, content })
            }
            // 写文本（新建/覆盖）；用 node fs 写，路径已由 ctx.fs.resolve 规范化
            if (name === '/write') {
              const path = q.get('path')
              const content = q.get('content') ?? ''
              if (!path) return send(res, { ok: false, error: 'no path' })
              const target = await ctx.fs.resolve(path)
              await fs.writeFile(target, content, 'utf-8')
              return send(res, { ok: true })
            }
            // 删除
            if (name === '/delete') {
              const path = q.get('path')
              if (!path) return send(res, { ok: false, error: 'no path' })
              await fs.unlink(path)
              return send(res, { ok: true })
            }
            return send(res, { ok: false, error: 'not found' }, 404)
          } catch (e: any) {
            return send(res, { ok: false, error: String((e && e.message) || e) }, 500)
          }
        },
      }),
    'dsh-agents-panel: routes',
  )
}
