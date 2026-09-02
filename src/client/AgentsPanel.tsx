import React, { useCallback, useEffect, useState } from 'react'
import { isOpen, on, toggle } from './store'

// 基础 ~/.agents 根
const ROOT = '~/.agents'

// 文件树面板组件（右侧浮层）
export function AgentsPanel() {
  const [visible, setVisible] = useState(isOpen())
  useEffect(() => on(() => setVisible(isOpen())), [])
  if (!visible) return null
  return (
    <div style={styles.overlay}>
      <div style={styles.head}>
        <b style={{ color: '#fff' }}>公共仓库 · ~/.agents</b>
        <button onClick={toggle} style={styles.closeBtn}>×</button>
      </div>
      <RepoTree />
    </div>
  )
}

// 侧边栏底部的「公共仓库」按钮
export function PublicRepoButton() {
  return (
    <button onClick={toggle} style={styles.footBtn}>
      <span style={{ fontSize: 13 }}>📂</span>
      <span>公共仓库</span>
    </button>
  )
}

type Item = { name: string; type: string; path: string }
type Listing = { ok: boolean; dir: string; dirs: Item[]; files: Item[] }

function RepoTree() {
  const [dir, setDir] = useState<string>(ROOT)
  const [data, setData] = useState<Listing | null>(null)
  const [err, setErr] = useState('')
  const [sel, setSel] = useState<{ path: string; content: string } | null>(null)
  const [draft, setDraft] = useState('')

  const load = useCallback(async (d: string) => {
    setErr('')
    setSel(null)
    try {
      const r = await fetch(`/agents/list?dir=${encodeURIComponent(d)}`)
      const j = (await r.json()) as Listing
      if (!j.ok) throw new Error((j as any).error || 'list failed')
      setData(j)
      setDir(j.dir)
    } catch (e: any) {
      setErr(String((e && e.message) || e))
    }
  }, [])

  useEffect(() => {
    void load(dir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = async (path: string) => {
    try {
      const r = await fetch(`/agents/read?path=${encodeURIComponent(path)}`)
      const j = await r.json()
      setSel({ path, content: j.content ?? '' })
      setDraft(j.content ?? '')
    } catch (e: any) {
      setErr(String((e && e.message) || e))
    }
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
    void load(parent || ROOT)
  }

  return (
    <div style={styles.body}>
      <div style={styles.toolbar}>
        <button onClick={up} style={styles.tbBtn}>⬆ 上级</button>
        <button onClick={makeFile} style={styles.tbBtn}>＋ 新建</button>
        <span style={styles.crumb}>{dir}</span>
      </div>
      {err && <div style={{ color: '#f66', fontSize: 12, padding: 8 }}>{err}</div>}
      <div style={styles.tree}>
        {data?.dirs.map((d) => (
          <div key={d.path} style={styles.row} onClick={() => load(d.path)}>
            <span>📁</span> <span>{d.name}/</span>
          </div>
        ))}
        {data?.files.map((f) => (
          <div key={f.path} style={styles.row} onClick={() => open(f.path)}>
            <span>📄</span> <span>{f.name}</span>
          </div>
        ))}
      </div>
      {sel && (
        <div style={styles.preview}>
          <div style={styles.previewHead}>
            <span>{sel.path}</span>
            <button onClick={() => remove(sel.path)} style={{ color: '#f66' }}>删除</button>
            <button onClick={save} style={{ color: '#3a6' }}>保存</button>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={styles.textarea}
          />
        </div>
      )}
    </div>
  )
}

// 样式
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', top: 0, right: 0, height: '100vh', width: 340,
    background: '#111a2e', color: '#dfe6f5', zIndex: 100000,
    borderLeft: '1px solid #2a3550', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 30px rgba(0,0,0,.4)',
  },
  head: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', borderBottom: '1px solid #26314c', flexShrink: 0,
  },
  closeBtn: { background: 'transparent', color: '#8b99ad', fontSize: 20, lineHeight: 1, border: 'none', cursor: 'pointer' },
  body: { flex: 1, overflow: 'auto', padding: '10px 12px', fontSize: 12.5 },
  toolbar: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  tbBtn: { background: '#223052', color: '#dfe6f5', border: '1px solid #33456d', borderRadius: 6, padding: '3px 8px', fontSize: 12, cursor: 'pointer' },
  crumb: { color: '#8b99ad', fontSize: 11.5, wordBreak: 'break-all' },
  tree: { display: 'flex', flexDirection: 'column', gap: 2 },
  row: { display: 'flex', gap: 6, alignItems: 'center', padding: '4px 6px', borderRadius: 6, cursor: 'pointer' },
  preview: { marginTop: 10, border: '1px solid #33456d', borderRadius: 8, overflow: 'hidden' },
  previewHead: { display: 'flex', gap: 10, alignItems: 'center', padding: '6px 10px', background: '#1c2740', fontSize: 11.5 },
  textarea: { width: '100%', minHeight: 220, background: '#0d1425', color: '#dfe6f5', border: 'none', outline: 'none', padding: 8, fontSize: 12, fontFamily: 'monospace', resize: 'vertical' },
  footBtn: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', color: '#aab6d2', border: 'none', padding: '9px 14px', cursor: 'pointer', fontSize: 13 },
}
