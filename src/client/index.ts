// Browser 半部：注册「公共仓库」侧边栏按钮 + 右侧浮层面板
import React from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { AgentsPanel, PublicRepoButton } from './AgentsPanel'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  // 右侧浮层面板（shell.overlay，可叠加不覆盖）
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      { name: 'shell.overlay', id: 'dsh-agents-panel', order: 100 },
      () => React.createElement(AgentsPanel),
    ),
  )
  // 侧边栏底部「公共仓库」按钮（sidebar.footer.action，可叠加）
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      { name: 'sidebar.footer.action', id: 'dsh-agents-panel', order: 100 },
      (props) => React.createElement(PublicRepoButton, props),
    ),
  )
}
