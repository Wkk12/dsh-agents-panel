import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { isOpen, on, toggle } from './store'

// 设计系统(ui-ux-pro-max):深色开发者工具配色,跟随 DSH 主题读取 + 兜底
const P = { bg: '#0F172A', fg: '#F8FAFC', border: '#475569', accent: '#22C55E', dest: '#EF4444' }

type Theme = { surface: string; fg: string; border: string; accent: string; dest: string }
function readTheme(): Theme {
  const root = getComputedStyle(document.documentElement)
  const body = getComputedStyle(document.body)
  const v = (n: string, fb: string) => root.getPropertyValue(n).trim() || fb
  return {
    surface: v('--dsw-alias-bg-base', body.backgroundColor || P.bg),
    fg: body.color || P.fg,
    border: v('--dsw-alias-border-l3', P.border),
    accent: P.accent,
    dest: P.dest,
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

// 轻量 Markdown 渲染(标题/粗斜体/行内code/代码块/列表/引用/链接/分隔线)
function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function inline(s: string) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}
function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let html = '', inCode = false, code = '', list = ''
  for (const line of lines) {
    if (inCode) { if (line.trim().startsWith('```')) { html += '<pre><code>' + esc(code) + '</code></pre>'; inCode = false; code = '' } else code += line + '\n'; continue }
    if (line.trim().startsWith('```')) { inCode = true; continue }
    const h = line.match(/^(#{1,6})\s+(.*)/)
    if (h) { html += `<h${h[1].length}>${inline(esc(h[2]))}</h${h[1].length}>`; continue }
    const li = line.match(/^([-*])\s+(.*)/)
    if (li) { if (list !== 'ul') { if (list) html += `</${list}>`; list = 'ul'; html += '<ul>' } html += `<li>${inline(esc(li[2]))}</li>`; continue }
    if (/^\d+\.\s+/.test(line)) { if (list !== 'ol') { if (list) html += `</${list}>`; list = 'ol'; html += '<ol>' } html += `<li>${inline(esc(line.replace(/^\d+\.\s+/, '')))}</li>`; continue }
    if (list) { html += `</${list}>`; list = '' }
    if (line.trim() === '') continue
    if (line.trim() === '---') { html += '<hr>'; continue }
    if (line.startsWith('> ')) { html += `<blockquote>${inline(esc(line.slice(2)))}</blockquote>`; continue }
    html += `<p>${inline(esc(line))}</p>`
  }
  if (inCode) html += '<pre><code>' + esc(code) + '</code></pre>'
  if (list) html += `</${list}>`
  return html
}

// 最小 SVG 图标(Lucide 风格,不用 emoji)
const Icon = ({ d, size = 14, fill = 'none' }: { d: string; size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d={d} /></svg>
)
const IC = {
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  up: 'M12 19V5 M5 12l7-7 7 7',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6L6 18M6 6l12 12',
  eyes: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
}

export function AgentsPanel() {
  const [visible, setVisible] = useState(isOpen())
  useEffect(() => on(() => setVisible(isOpen())), [])
  const theme = useTheme()
  if (!visible) return null
  const modal = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2147483000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) toggle() }}
    >
      <style>{`
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
      `}</style>
      <div style={{ width: 1020, maxWidth: '95vw', height: '86vh', maxHeight: '93vh', background: theme.surface, color: theme.fg, border: `1px solid ${theme.border}`, borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon d={IC.folder} size={16} />
            <b style={{ fontSize: 14, letterSpacing: '.3px' }}>公共仓库 · ~/.agents</b>
          </div>
          <button onClick={toggle} aria-label="关闭" style={{ background: 'transparent', border: 'none', color: theme.fg, opacity: .7, width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .15s' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(128,128,128,.18)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <Icon d={IC.x} size={18} />
          </button>
        </div>
        <RepoTree theme={theme} />
      </div>
    </div>
  )
  return createPortal(modal, document.body)
}

export function PublicRepoButton() {
  return (
    <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: 'transparent', color: 'inherit', border: 'none', padding: '9px 14px', cursor: 'pointer', fontSize: 13, borderRadius: 8 }}>
      <Icon d={IC.folder} size={15} />
      <span>公共仓库</span>
    </button>
  )
}

type Item = { name: string; type: string; path: string }
type Listing = { ok: boolean; dir: string; dirs: Item[]; files: Item[] }
type Tab = { path: string; name: string; content: string }

function RepoTree({ theme }: { theme: Theme }) {
  const [dir, setDir] = useState('')
  const [data, setData] = useState<Listing | null>(null)
  const [err, setErr] = useState('')
  const [tabs, setTabs] = useState<Tab[]>([])
  const [active, setActive] = useState<number>(-1)
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState<'preview' | 'source'>('preview')

  const load = useCallback(async (d: string) => {
    setErr('')
    try {
      const url = `/agents/list` + (d && d !== '~/.agents' ? `?dir=${encodeURIComponent(d)}` : '')
      const r = await fetch(url)
      const j = (await r.json()) as Listing
      if (!j.ok) throw new Error((j as any).error || 'list failed')
      setData(j); setDir(j.dir)
    } catch (e: any) { setErr(String((e && e.message) || e)) }
  }, [])

  useEffect(() => { void load('') }, [load])

  const openFile = async (path: string) => {
    const idx = tabs.findIndex((t) => t.path === path)
    if (idx >= 0) { setActive(idx); setDraft(tabs[idx].content); setMode(tabs[idx].name.endsWith('.md') ? 'preview' : 'source'); return }
    try {
      const r = await fetch(`/agents/read?path=${encodeURIComponent(path)}`)
      const j = await r.json()
      const name = path.split('/').pop() || path
      const tab: Tab = { path, name, content: j.content ?? '' }
      setTabs((ts) => [...ts, tab]); setActive(tabs.length); setDraft(tab.content); setMode(name.endsWith('.md') ? 'preview' : 'source')
    } catch (e: any) { setErr(String((e && e.message) || e)) }
  }
  const closeTab = (i: number) => {
    setTabs((ts) => ts.filter((_, k) => k !== i))
    setActive((a) => (a === i ? -1 : a > i ? a - 1 : a))
  }
  const save = async () => {
    const t = tabs[active]; if (!t) return
    await fetch(`/agents/write?path=${encodeURIComponent(t.path)}&content=${encodeURIComponent(draft)}`)
    setTabs((ts) => ts.map((x, k) => (k === active ? { ...x, content: draft } : x)))
    window.alert('已保存')
  }
  const remove = async (i: number) => {
    const t = tabs[i]; if (!t) return
    if (!window.confirm(`删除 ${t.path}？`)) return
    await fetch(`/agents/delete?path=${encodeURIComponent(t.path)}`)
    closeTab(i); void load(dir)
  }
  const makeFile = async () => {
    const name = window.prompt('新文件名（如 tools/hello.md，相对当前目录）')
    if (!name) return
    const full = `${dir.replace(/\/$/, '')}/${name.replace(/^\//, '')}`
    await fetch(`/agents/write?path=${encodeURIComponent(full)}&content=`)
    void load(dir)
  }
  const up = () => { const p = dir.replace(/\/$/, ''); void load(p.slice(0, p.lastIndexOf('/')) || '') }

  const t = tabs[active]
  const isMd = !!t && t.name.endsWith('.md')
  const hover = 'rgba(128,128,128,.14)'
  const row = { display: 'flex', gap: 7, alignItems: 'center', padding: '4px 6px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, transition: 'background .15s' }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* 左:文件树 */}
      <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '9px 12px', flexShrink: 0 }}>
          <button onClick={up} style={{ background: 'transparent', color: theme.fg, border: `1px solid ${theme.border}`, borderRadius: 7, padding: '4px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'background .15s' }} onMouseEnter={(e) => (e.currentTarget.style.background = hover)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}><Icon d={IC.up} size={13} /> 上级</button>
          <button onClick={makeFile} style={{ background: 'transparent', color: theme.fg, border: `1px solid ${theme.border}`, borderRadius: 7, padding: '4px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'background .15s' }} onMouseEnter={(e) => (e.currentTarget.style.background = hover)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}><Icon d={IC.plus} size={13} /> 新建</button>
        </div>
        <div style={{ padding: '0 8px 6px', fontSize: 11, color: theme.fg, opacity: .55, wordBreak: 'break-all' }}>{dir || '~/.agents'}</div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 10px' }}>
          {err && <div style={{ color: theme.dest, padding: 8, fontSize: 12 }}>{err}</div>}
          {data?.dirs.map((d) => (
            <div key={d.path} onClick={() => load(d.path)} style={{ ...row, color: theme.fg }} onMouseEnter={(e) => (e.currentTarget.style.background = hover)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}><Icon d={IC.folder} size={14} /> <span>{d.name}/</span></div>
          ))}
          {data?.files.map((f) => (
            <div key={f.path} onClick={() => openFile(f.path)} style={{ ...row, color: theme.fg }} onMouseEnter={(e) => (e.currentTarget.style.background = hover)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}><Icon d={IC.file} size={14} /> <span>{f.name}</span></div>
          ))}
        </div>
      </div>

      {/* 右:多文件 tabs 预览 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {tabs.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.fg, opacity: .5, fontSize: 13 }}>点击左侧文件以打开预览</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderBottom: `1px solid ${theme.border}`, overflowX: 'auto', flexShrink: 0 }}>
              {tabs.map((x, i) => (
                <div key={x.path} onClick={() => { setActive(i); setDraft(x.content); setMode(x.name.endsWith('.md') ? 'preview' : 'source') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: i === active ? 'rgba(128,128,128,.16)' : 'transparent', color: theme.fg, whiteSpace: 'nowrap', border: `1px solid ${i === active ? theme.accent : 'transparent'}`, transition: 'background .15s' }}>
                  <span>{x.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); closeTab(i) }} aria-label="关闭" style={{ background: 'transparent', border: 'none', color: 'inherit', opacity: .6, cursor: 'pointer', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={IC.x} size={12} /></button>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 12px', fontSize: 11.5, color: theme.fg, opacity: .7, flexShrink: 0 }}>
                <span style={{ flex: 1, wordBreak: 'break-all' }}>{t?.path}</span>
                {isMd && (
                  <button onClick={() => setMode(mode === 'preview' ? 'source' : 'preview')} style={{ background: 'transparent', border: 'none', color: theme.accent, cursor: 'pointer' }}>
                    {mode === 'preview' ? '编辑源码' : '预览'}
                  </button>
                )}
                <button onClick={() => remove(active)} style={{ background: 'transparent', border: 'none', color: theme.dest, cursor: 'pointer' }}>删除</button>
                <button onClick={save} style={{ background: 'transparent', border: 'none', color: theme.accent, cursor: 'pointer' }}>保存</button>
              </div>
              {isMd && mode === 'preview' ? (
                <div className="ap-md" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 14px 14px', fontSize: 13 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(draft) }} />
              ) : (
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false}
                  style={{ flex: 1, minHeight: 0, background: 'transparent', color: theme.fg, border: 'none', outline: 'none', padding: '0 12px 12px', fontSize: 12.5, fontFamily: '"SF Mono","Menlo","Consolas",monospace', resize: 'none', lineHeight: 1.6 }} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
