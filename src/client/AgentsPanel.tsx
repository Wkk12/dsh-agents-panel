import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { isOpen, on, toggle } from './store'

// 主题:跟随 DSH 亮/暗;优先读实际颜色,读不到用亮/暗兜底
const LIGHT = { bg: '#ffffff', fg: '#1a2233', border: '#e4e9f0', accent: '#1677ff', dest: '#f04438' }
const DARK = { bg: '#0F172A', fg: '#F8FAFC', border: '#333a4a', accent: '#22C55E', dest: '#EF4444' }

type Theme = { surface: string; fg: string; border: string; accent: string; dest: string }
function readTheme(): Theme {
  const root = getComputedStyle(document.documentElement)
  const body = getComputedStyle(document.body)
  const isDark = document.body.hasAttribute('data-ds-dark-theme') || document.documentElement.hasAttribute('data-ds-dark-theme')
  const base = isDark ? DARK : LIGHT
  const vb = (n: string, fb: string) => root.getPropertyValue(n).trim() || fb
  const bgc = body.backgroundColor && body.backgroundColor !== 'rgba(0, 0, 0, 0)' ? body.backgroundColor : ''
  const fgc = body.color && body.color !== 'rgba(0, 0, 0, 0)' ? body.color : ''
  return {
    surface: vb('--dsw-alias-bg-base', bgc || base.bg),
    fg: fgc || base.fg,
    border: vb('--dsw-alias-border-l3', base.border),
    accent: base.accent,
    dest: base.dest,
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

const tabBtn = (t: Theme): React.CSSProperties => ({ background: 'transparent', color: t.fg, border: 'none', padding: '5px 12px', borderRadius: 7, fontSize: 12.5, cursor: 'pointer', transition: 'background .15s' })

export function AgentsPanel() {
  const [visible, setVisible] = useState(isOpen())
  useEffect(() => on(() => setVisible(isOpen())), [])
  const [openSeq, setOpenSeq] = useState(0)
  // 每次打开弹窗都递增,强制内容重新挂载、重新拉取最新数据
  useEffect(() => { if (visible) setOpenSeq((s) => s + 1) }, [visible])
  const [tab, setTab] = useState<'files' | 'rules'>('files')
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon d={IC.folder} size={16} />
              <b style={{ fontSize: 14, letterSpacing: '.3px' }}>公共仓库</b>
            </div>
            <div style={{ display: 'flex', gap: 4, padding: '3px', background: 'rgba(128,128,128,.12)', borderRadius: 9 }}>
              <button onClick={() => setTab('files')} style={{ ...tabBtn(theme), background: tab === 'files' ? 'rgba(128,128,128,.2)' : 'transparent' }}>文件</button>
              <button onClick={() => setTab('rules')} style={{ ...tabBtn(theme), background: tab === 'rules' ? 'rgba(128,128,128,.2)' : 'transparent' }}>规则</button>
            </div>
          </div>
          <button onClick={toggle} aria-label="关闭" style={{ background: 'transparent', border: 'none', color: theme.fg, opacity: .7, width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .15s' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(128,128,128,.18)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <Icon d={IC.x} size={18} />
          </button>
        </div>
        {tab === 'files' ? <RepoTree theme={theme} /> : <RulesPanel key={openSeq} theme={theme} />}
      </div>
    </div>
  )
  return createPortal(modal, document.body)
}

export function PublicRepoButton({ wide = true }: { wide?: boolean }) {
  return (
    <button onClick={toggle} title="公共仓库" style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: 'transparent', color: 'inherit', border: 'none', padding: '9px 14px', cursor: 'pointer', fontSize: 13, borderRadius: 8, justifyContent: wide ? 'flex-start' : 'center' }}>
      <Icon d={IC.folder} size={15} />
      {wide && <span>公共仓库</span>}
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
  const openDir = async () => {
    const p = dir || '~/.agents'
    await fetch(`/agents/open?path=${encodeURIComponent(p)}`)
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
          <button onClick={openDir} title="在系统资源管理器打开当前目录" style={{ background: 'transparent', color: theme.fg, border: `1px solid ${theme.border}`, borderRadius: 7, padding: '4px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'background .15s' }} onMouseEnter={(e) => (e.currentTarget.style.background = hover)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}><Icon d="M20 4a2 2 0 0 0-2-2h-8l-2-2H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" size={13} /> 打开资源管理器</button>
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

// ============ 规则：分类 + 按工作区根目录勾选 ============
type Rule = { id: string; name: string; category: string; applies: string; description: string; file: string }

function RulesPanel({ theme }: { theme: Theme }) {
  const [rules, setRules] = useState<Rule[]>([])
  const [sels, setSels] = useState<Record<string, string[]>>({})
  const [defaultRules, setDefaultRules] = useState<string[]>([])
  const [wsList, setWsList] = useState<{ path: string; title: string }[]>([])
  const [ws, setWs] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [booting, setBooting] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [lr, lw] = await Promise.all([fetch('/rules/library').then((r) => r.json()), fetch('/rules/workspaces').then((r) => r.json())])
        setRules(lr.rules || []); setSels(lr.selections || {}); setDefaultRules(lr.defaultRules || [])
        setWsList((lw as any).workspaces || [])
      } catch (e: any) { setMsg({ text: String((e && e.message) || e), ok: false }) }
    })()
  }, [])

  const chooseWs = (w: string) => { setWs(w); const saved = sels[w]; setChecked(new Set(saved && saved.length ? saved : defaultRules)); setMsg(null) }
  const toggle = (id: string) => { setChecked((c) => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  const save = async () => {
    if (!ws) { setMsg({ text: '请选择工作区', ok: false }); return }
    setBusy(true)
    try {
      const r = await fetch('/rules/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ws, rules: Array.from(checked) }) })
      const j = await r.json()
      setMsg(j.ok ? { text: `已保存 ${ws}/CLAUDE.local.md`, ok: true } : { text: j.error || '保存失败', ok: false })
      setSels((s) => ({ ...s, [ws]: Array.from(checked) }))
    } catch (e: any) { setMsg({ text: String((e && e.message) || e), ok: false }) }
    setBusy(false)
  }

  const bootstrapAll = async () => {
    setBooting(true)
    try {
      const r = await fetch('/rules/bootstrap')
      const j = await r.json()
      setMsg(j.ok ? (j.bootstrapped ? { text: `已为 ${j.bootstrapped} 个缺失规则的工作区生成默认规则`, ok: true } : { text: `全部工作区都已有规则文件，未改动`, ok: true }) : { text: j.error || '引导失败', ok: false })
    } catch (e: any) { setMsg({ text: String((e && e.message) || e), ok: false }) }
    setBooting(false)
  }

  const cats = Array.from(new Set(rules.map((r) => r.category)))
  const hover = 'rgba(128,128,128,.08)'

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* 左:工作区列表 */}
      <div style={{ width: 250, flexShrink: 0, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'transparent' }}>
        <div style={{ padding: '12px 14px 6px', fontSize: 12, fontWeight: 600, color: theme.fg, flexShrink: 0 }}>工作区</div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px 12px' }}>
          {wsList.length === 0 && <div style={{ color: theme.fg, opacity: .45, fontSize: 12.5, padding: 12 }}>暂无工作区</div>}
          {wsList.map((w) => (
            <div key={w.path} onClick={() => chooseWs(w.path)} title={w.path} style={{ padding: '8px 10px', borderRadius: 9, fontSize: 12, cursor: 'pointer', marginBottom: 2, background: ws === w.path ? 'rgba(128,128,128,.14)' : 'transparent', color: theme.fg, transition: 'background .15s' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(128,128,128,.1)')} onMouseLeave={(e) => (e.currentTarget.style.background = ws === w.path ? 'rgba(128,128,128,.14)' : 'transparent')}>
              <div style={{ fontWeight: 500 }}>{w.title}</div>
              <div style={{ opacity: .5, fontSize: 10.5, marginTop: 1, wordBreak: 'break-all' }}>{w.path}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 右:规则分类勾选(卡片化) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: theme.fg, opacity: .75 }}>勾选本工作区要使用的规则({checked.size}/{rules.length})</span>
          <button onClick={bootstrapAll} disabled={booting} title="为所有还没规则文件的工作区自动生成默认规则" style={{ background: 'transparent', color: theme.fg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', opacity: booting ? .6 : .85, transition: 'opacity .15s' }}>{booting ? '引导中…' : '引导未生成'}</button>
          <button onClick={save} disabled={busy} style={{ background: theme.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 12.5, cursor: 'pointer', fontWeight: 500, opacity: busy ? .6 : 1, transition: 'opacity .15s' }}>{busy ? '保存中…' : '保存并生成本地规则'}</button>
        </div>
        {msg && <div style={{ padding: '8px 16px', fontSize: 12.5, color: msg.ok ? theme.accent : theme.dest, background: msg.ok ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.08)', borderBottom: `1px solid ${theme.border}` }}>{msg.text}</div>}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
          {cats.map((cat) => (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.fg, opacity: .8, marginBottom: 8, letterSpacing: '.3px' }}>{cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rules.filter((r) => r.category === cat).map((r) => {
                  const on = checked.has(r.id)
                  return (
                    <label key={r.id} onClick={() => toggle(r.id)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '11px 13px', borderRadius: 11, border: `1px solid ${on ? theme.accent : theme.border}`, background: on ? 'rgba(128,128,128,.08)' : 'transparent', cursor: 'pointer', transition: 'all .15s' }} onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = hover }} onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent' }}>
                      <input type="checkbox" checked={on} readOnly style={{ marginTop: 2, accentColor: theme.accent, width: 15, height: 15 }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, color: theme.fg, fontWeight: 500 }}>{r.name}</span>
                          {r.applies && <span style={{ fontSize: 10.5, color: theme.accent, border: `1px solid ${theme.accent}`, borderRadius: 5, padding: '1px 7px', lineHeight: 1.5 }}>适用:{r.applies}</span>}
                        </span>
                        <span style={{ display: 'block', fontSize: 11.5, color: theme.fg, opacity: .6, marginTop: 3 }}>{r.description}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
