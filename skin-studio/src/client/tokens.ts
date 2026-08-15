/** Curated token directory and stable-DOM hooks for the skin studio. */

/** One editable theme token: CSS variable + human label + group. */
export interface TokenEntry {
  variable: string
  label: string
  group: 'surface' | 'text' | 'accent' | 'border' | 'state' | 'scrollbar'
}

/**
 * The tokens users most often want to change. All of them are alias tokens
 * (the layer the theme system expects overrides on); each has a light/dark
 * pair. Sourced from the ui-theme BUILTIN_INSPECT_TOKENS directory.
 */
export const TOKEN_DIRECTORY: TokenEntry[] = [
  // surfaces
  { variable: '--dsw-alias-bg-base', label: '应用底色', group: 'surface' },
  { variable: '--dsw-alias-bg-layer-1', label: '一级表面（卡片）', group: 'surface' },
  { variable: '--dsw-alias-bg-layer-2', label: '二级表面（嵌套）', group: 'surface' },
  { variable: '--dsw-alias-bg-overlay', label: '浮层/弹窗背景', group: 'surface' },
  { variable: '--dsw-specific-sidebar-fill', label: '侧边栏底色', group: 'surface' },
  { variable: '--dsw-specific-bubble', label: '用户气泡底色', group: 'surface' },
  { variable: '--dsw-alias-markdown-code-block', label: '代码块底色', group: 'surface' },
  { variable: '--dsw-alias-button-floating-fill', label: '浮动按钮底色', group: 'surface' },
  // text
  { variable: '--dsw-alias-label-primary', label: '主文字', group: 'text' },
  { variable: '--dsw-alias-label-secondary', label: '次要文字', group: 'text' },
  { variable: '--dsw-alias-label-tertiary', label: '三级文字', group: 'text' },
  { variable: '--dsw-alias-label-caption', label: '标注文字', group: 'text' },
  // accent
  { variable: '--dsw-alias-brand-primary', label: '品牌强调色', group: 'accent' },
  { variable: '--dsw-alias-interactive-bg-hover', label: '悬停底色', group: 'accent' },
  { variable: '--dsw-alias-interactive-bg-hover-solid', label: '悬停底色（实心）', group: 'accent' },
  // borders
  { variable: '--dsw-alias-border-l1', label: '边框 L1', group: 'border' },
  { variable: '--dsw-alias-border-l2', label: '边框 L2', group: 'border' },
  { variable: '--dsw-alias-border-l3', label: '边框 L3', group: 'border' },
  // state
  { variable: '--dsw-alias-state-error-primary', label: '错误色', group: 'state' },
  { variable: '--dsw-alias-state-success-primary', label: '成功色', group: 'state' },
  { variable: '--dsw-alias-state-warn-primary', label: '警告色', group: 'state' },
  // scrollbar
  { variable: '--dsw-alias-scrollbar-bg-l2', label: '滚动条滑块', group: 'scrollbar' },
  { variable: '--dsw-alias-scrollbar-hover-l2', label: '滚动条悬停', group: 'scrollbar' },
]

export const TOKEN_GROUPS: Record<TokenEntry['group'], string> = {
  surface: '表面',
  text: '文字',
  accent: '强调',
  border: '边框',
  state: '状态',
  scrollbar: '滚动条',
}

/** Parse a CSS color string to an {r,g,b,a} tuple, or null. */
export function parseColor(value: string): { r: number; g: number; b: number; a: number } | null {
  const trimmed = value.trim()
  const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(trimmed)
  if (hex !== null) {
    let body = hex[1]
    if (body.length === 3) body = [...body].map((ch) => ch + ch).join('')
    return {
      r: parseInt(body.slice(0, 2), 16),
      g: parseInt(body.slice(2, 4), 16),
      b: parseInt(body.slice(4, 6), 16),
      a: 1,
    }
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i.exec(trimmed)
  if (rgb !== null) {
    const alpha = rgb[4] === undefined ? 1 : parseFloat(rgb[4])
    return {
      r: Math.round(parseFloat(rgb[1])),
      g: Math.round(parseFloat(rgb[2])),
      b: Math.round(parseFloat(rgb[3])),
      a: rgb[4]?.endsWith('%') ? alpha / 100 : alpha,
    }
  }
  return null
}

/** Serialize a color tuple as `rgb(r g b / a)` (alpha omitted when 1). */
export function formatColor(color: { r: number; g: number; b: number; a: number }): string {
  const { r, g, b, a } = color
  return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgb(${r}, ${g}, ${b}, ${a})`
}

/** Convert a CSS color to `#rrggbb` when it has no alpha, else null. */
export function toHex(value: string): string | null {
  const parsed = parseColor(value)
  if (parsed === null || parsed.a !== 1) return null
  const channel = (n: number): string => n.toString(16).padStart(2, '0')
  return `#${channel(parsed.r)}${channel(parsed.g)}${channel(parsed.b)}`
}

/** Convert `#rrggbb` to a `rgb(r, g, b)` string. */
export function fromHex(value: string): string | null {
  const parsed = parseColor(value)
  if (parsed === null) return null
  return formatColor(parsed)
}

/** Alpha-multiply an opaque or translucent CSS color. */
export function withAlpha(value: string, alpha: number): string {
  const parsed = parseColor(value)
  if (parsed === null) return value
  parsed.a = alpha
  return formatColor(parsed)
}

/**
 * Stable DOM hooks that survive client-bundle rebuilds (CSS-module class
 * names are hashed per build and are NOT safe to ship in user CSS). The
 * element picker generates selectors from these anchors. `data-pane` is a
 * forward-facing facade (not present in every build); the `[class*=...]`
 * substring fallbacks mirror the maid-atelier skin's verified selectors and
 * keep picker output working across builds either way.
 */
export const STABLE_HOOKS: string[] = [
  '[data-pane="sidebar"]',
  "[data-slot='sidebar.settings']",
  "[data-slot='sidebar.workspaces']",
  '[data-conversation-scroll]',
  '[data-composer-seat]',
  '[data-composer-card]',
  '[data-input-scroll]',
  '[data-chat-flow]',
  '[data-chat-anchor-key]',
  '[data-turn-tail]',
  '[data-approval-key]',
  '[data-testid="todo-panel"]',
  '[data-queue-dock]',
  "[data-phase='hero']",
  "[data-phase='active']",
  "[data-slot='settings.general.item']",
  "[data-slot='conversation.chat.node']",
  '[data-variant="think"]',
  '[data-decoration="token"]',
  '[data-decoration="chip"]',
  '[data-decoration="hint"]',
  // build-independent class-substring fallbacks
  "[class*='sidebarCol']",
  "[class*='centerCol']",
  "[class*='detailsCol']",
  "[class*='frame']",
  "[class*='titleRow']",
]
