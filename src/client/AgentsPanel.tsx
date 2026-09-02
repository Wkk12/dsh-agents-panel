import React, { useCallback, useEffect, useState } from 'react'
import { isOpen, on, toggle } from './store'

// 从页面运行时读取主题色（跟随亮/暗主题，不写死颜色）
type Theme = { surface: string; fg: string; border: string; muted: string; hover: string }
function readTheme(): Theme {
  const root = getComputedStyle(document.documentElement)
  const body = getComputedStyle(document.body)
  const cs = (n: string, fb: string) => root.getPropertyValue(n).trim() || fb
  return {
    surface: cs('--dsw-alias-bg-base', body.backgroundColor || '#1a1e2b'),
    fg: body.color || '#dfe6f5',
    border: cs('--dsw-alias-border-l3', '#333a4a'),
    muted: body.color ? 'inherit' : '#8b99ad',
    hover: 'rgba(128,128,128,.12)',
  }
}
function useTheme(): Theme {
  const [t, setT] = useState<Theme>(() => readTheme())
  useEffect(() => {
    const update = () => setT(readTheme())
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ds-dark-theme', 'class', 'style'] })
    return () => mo.disconnect()
  }, [])
  return t
}

// 居中弹窗（类似设置弹框）
export function AgentsPanel() {
  const [visible, setVisible] = useState(isOpen())
  useEffect(() => on(() => setVisible(isOpen())), [])
  const theme = useTheme()
  if (!visible) return null
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) toggle() }}
    >
      <div style={{ width: 760, maxWidth: '92vw', height: '72vh', maxHeight: '88vh', background: theme.surface, color: theme.fg, border: `1px solid ${theme.border}`, borderRadius: 12, boxShadow: '0 24px 70px rgba(0,0,0,.45)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <b>公共仓库 · ~/.agents</b>
          <button onClick={toggle} style={{ background: 'transparent', border: 'none', color: theme.muted, fontSize: 22, lineHeight: 1, cursor: 'pointer' }}>×</button>
        </div>
        <RepoTree theme={theme} />
      </div>
    </div>
  )
}

// 侧边栏底部「公共仓库」按钮
export function PublicRepoButton() {
  return (
    <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', color: 'inherit', border: 'none', padding: '9px 14px', cursor: 'pointer', fontSize: 13 }}>
      <span style={{ fontSize: 15 }}>📂</span>
      <span>公共仓库</span>
    </button>
  )
}

type Item = { name: string; type: string; path: string }
type Listing = { ok: boolean; dir: string; dirs: Item[]; files: Item[] }

function RepoTree({ theme }: { theme: Theme }) {
  const [dir, setDir] = useState<string>('')   // '' = 初始(宿主解析到 ROOT)
  const [data, setData] = useState<Listing | null>(null)
  const [err, setErr] = useState('')
  const [sel, setSel] = useState<{ path: string; content: string } | null>(null)
  const [draft, setDraft] = useState('')

  const load = useCallback(async (d: string) => {
    setErr(''); setSel(null)
    try {
      const url = `/agents/list` + (d && d !== '~/.agents' ? `?dir=${encodeURIComponent(d)}` : '')
      const r = await fetch(url)
      const j = (await r.json()) as Listing
      if (!j.ok) throw new Error((j as any).error || 'list failed')
      setData(j); setDir(j.dir)
    } catch (e: any) { setErr(String((e && e.message) || e)) }
  }, [])

  useEffect(() => { void load('') }, [load])

  const open = async (path: string) => {
    try {
      const r = await fetch(`/agents/read?path=${encodeURIComponent(path)}`)
      const j = await r.json()
      setSel({ path, content: j.content ?? '' }); setDraft(j.content ?? '')
    } catch (e: any) { setErr(String((e && e.message) || e)) }
  }
  const remove = async (path: string) => {
    if (!window.confirm(`删除 ${path}？`)) return
    await fetch(`/agents/delete?path=${encodeURIComponent(path)}`)
    void load(dir)
  }
  const save = async () => {
    if (!sel) return
    await fetch(`/agents/write?path=${encodeURIComponent(sel.path)}&content=${encodeURIComponent(draft)}`)
    window.alert('已保存')
  }
  const makeFile = async () => {
    const name = window.prompt('新文件名（如 tools/hello.md，相对当前目录）')
    if (!name) return
    const full = `${dir.replace(/\/$/, '')}/${name.replace(/^\//, '')}`
    await fetch(`/agents/write?path=${encodeURIComponent(full)}&content=`)
    void load(dir)
  }
  const up = () => {
    const p = dir.replace(/\/$/, '')
    const parent = p.slice(0, p.lastIndexOf('/'))
    void load(parent || '')
  }

  const st = (s: React.CSSProperties): React.CSSProperties => ({ ...s, color: theme.fg })

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
        <button onClick={up} style={st({ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer' })}>⬆ 上级</button>
        <button onClick={makeFile} style={st({ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer' })}>＋ 新建</button>
        <span style={{ color: theme.muted, fontSize: 11.5, wordBreak: 'break-all' }}>{dir || '~/.agents'}</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px', fontSize: 12.5 }}>
        {err && <div style={{ color: '#f66', padding: 8 }}>{err}</div>}
        {data?.dirs.map((d) => (
          <div key={d.path} onClick={() => load(d.path)} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 6px', borderRadius: 6, cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.background = theme.hover)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <span>📁</span> <span>{d.name}/</span>
          </div>
        ))}
        {data?.files.map((f) => (
          <div key={f.path} onClick={() => open(f.path)} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 6px', borderRadius: 6, cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.background = theme.hover)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <span>📄</span> <span>{f.name}</span>
          </div>
        ))}
      </div>
      {sel && (
        <div style={{ borderTop: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', height: '38%' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 12px', fontSize: 11.5 }}>
            <span style={{ flex: 1, wordBreak: 'break-all' }}>{sel.path}</span>
            <button onClick={() => remove(sel.path)} style={{ background: 'transparent', border: 'none', color: '#f66', cursor: 'pointer' }}>删除</button>
            <button onClick={save} style={{ background: 'transparent', border: 'none', color: '#3a6', cursor: 'pointer' }}>保存</button>
          </div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} style={{ flex: 1, background: 'transparent', color: theme.fg, border: 'none', outline: 'none', padding: '0 12px 12px', fontSize: 12, fontFamily: 'monospace', resize: 'none' }} />
        </div>
      )}
    </div>
  )
}
