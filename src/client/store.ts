// 轻量开关：侧边栏按钮与右侧浮层面板之间的共享状态（同一 bundle 内共享实例）
let open = false
const listeners = new Set<() => void>()

export function isOpen(): boolean {
  return open
}
export function toggle(): void {
  open = !open
  listeners.forEach((l) => l())
}
export function close(): void {
  open = false
  listeners.forEach((l) => l())
}
export function on(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
