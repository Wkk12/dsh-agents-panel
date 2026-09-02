// Host 半部：提供 ~/.agents 文件树接口（列目录 / 读 / 写 / 删）
// 用 node fs + os.homedir() 直接读用户主目录的 ~/.agents。
// 不用 ctx.fs：DSH 的 ctx.fs 绑定在沙盒根(launch-root)，读不了主目录。
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'

const ROOT = join(homedir(), '.agents')

export const inject = ['webServer']

function send(res: any, body: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json;charset=utf-8' })
  res.end(JSON.stringify(body))
}

// 把前端传来的目录串规范到绝对路径
function targetDir(dir: string | null): string {
  if (!dir || dir === '~' || dir === '~/.agents' || dir === ROOT) return ROOT
  return dir
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
            if (name === '/list') {
              const target = targetDir(q.get('dir'))
              const ents = await fs.readdir(target, { withFileTypes: true })
              const dirs: any[] = []
              const files: any[] = []
              for (const e of ents) {
                const item = { name: e.name, type: e.isDirectory() ? 'directory' : 'file', path: join(target, e.name) }
                ;(e.isDirectory() ? dirs : files).push(item)
              }
              dirs.sort((a, b) => a.name.localeCompare(b.name))
              files.sort((a, b) => a.name.localeCompare(b.name))
              return send(res, { ok: true, dir: target, dirs, files })
            }
            if (name === '/read') {
              const p = q.get('path')
              if (!p) return send(res, { ok: false, error: 'no path' })
              const content = await fs.readFile(p, 'utf-8')
              return send(res, { ok: true, path: p, content })
            }
            if (name === '/write') {
              const p = q.get('path')
              const content = q.get('content') ?? ''
              if (!p) return send(res, { ok: false, error: 'no path' })
              await fs.mkdir(dirname(p), { recursive: true })
              await fs.writeFile(p, content, 'utf-8')
              return send(res, { ok: true })
            }
            if (name === '/delete') {
              const p = q.get('path')
              if (!p) return send(res, { ok: false, error: 'no path' })
              await fs.unlink(p)
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
