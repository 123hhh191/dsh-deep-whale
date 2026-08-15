/**
 * Element picker toolbar: hover-highlight, stable-selector generation, quick
 * paint, and a Word-style format pane — click an element, then set fill
 * (none / solid / gradient with direction + strength) and soft edges
 * (blur strength + range) with live preview; changes save immediately.
 */

import { store } from './store.ts'
import { STABLE_HOOKS } from './tokens.ts'

const PICKER_ATTR = 'data-skin-studio-picker'

const TOOLBAR_STYLE = `
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  border-radius: 999px;
  background: var(--dsw-alias-bg-overlay, #fff);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
`

const TOOL_BUTTON_STYLE = `
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-primary, #111);
  font: 600 12px/1 var(--dsw-font-family, system-ui, sans-serif);
  cursor: pointer;
  white-space: nowrap;
`

const ACTIVE_BUTTON_STYLE = `
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
  border-color: transparent;
`

/** Attribute names considered stable enough to ship in a user selector. */
const STABLE_ATTRS = [
  'data-slot',
  'data-pane',
  'data-phase',
  'data-chat-flow',
  'data-chat-flow-kind',
  'data-variant',
  'data-testid',
  'data-state',
  'data-status',
  'data-side',
  'data-decoration',
  'data-error',
  'data-streaming',
  'data-active',
  'data-compaction-disclosure',
  'data-context-source',
  'data-time-hover-root',
]

const CSS_ESCAPE_ATTR = /["\\]/g

function attrSelector(name: string, value: string): string {
  const safe = value.replace(CSS_ESCAPE_ATTR, '\\$&')
  return `[${name}="${safe}"]`
}

function stableSelfSelector(element: Element): string | null {
  for (const name of STABLE_ATTRS) {
    const value = element.getAttribute(name)
    if (value === null || value === '') continue
    const selector = attrSelector(name, value)
    // Only trust it when it uniquely addresses this element right now.
    if (document.querySelectorAll(selector).length === 1) return selector
  }
  return null
}

function nthPath(element: Element, until: Element | null): string {
  const chain: string[] = []
  let current: Element | null = element
  while (current !== null && current !== until && current !== document.body && current !== document.documentElement) {
    const tag = current.tagName.toLowerCase()
    const parent = current.parentElement
    if (parent === null) {
      chain.unshift(tag)
      break
    }
    const index = [...parent.children].indexOf(current) + 1
    chain.unshift(`${tag}:nth-child(${index})`)
    current = parent
  }
  return chain.join(' > ')
}

/**
 * Generate a stable selector for an element. Priority:
 * 1. unique stable data-attribute on the element itself
 * 2. nearest stable ancestor hook + nth-child path down to the element
 * 3. absolute tag/nth-child path from body
 * The result is validated against the live DOM and refined with
 * `:nth-of-type` when it addresses more than one element.
 */
export function generateSelector(element: Element): string {
  const self = stableSelfSelector(element)
  if (self !== null) return self

  // The element itself matches a stable hook (e.g. the sidebar column's
  // `[class*=sidebarCol]`) — use that hook expression verbatim when unique.
  const selfHook = STABLE_HOOKS.find((hook) => element.matches(hook))
  if (selfHook !== undefined && document.querySelectorAll(selfHook).length === 1) return selfHook

  const anchor = element.closest(STABLE_HOOKS.join(','))
  let selector: string
  if (anchor !== null && anchor !== element) {
    selector = `${anchorTagSelector(anchor)} > ${nthPath(element, anchor)}`
  } else {
    selector = `body > ${nthPath(element, document.body)}`
  }

  // Refine to uniqueness.
  let matches = document.querySelectorAll(selector)
  let depth = 0
  while (matches.length > 1 && depth < 8) {
    selector = refineWithNthOfType(selector, element, depth)
    matches = document.querySelectorAll(selector)
    depth += 1
  }
  return selector
}

/** A stable hook element may itself be ambiguous across panes; use the hook selector verbatim. */
function anchorTagSelector(anchor: Element): string {
  const self = stableSelfSelector(anchor)
  if (self !== null) return self
  // Fall back to the matched hook expression: re-derive via closest on the anchor.
  const matched = STABLE_HOOKS.find((hook) => anchor.matches(hook))
  return matched ?? anchor.tagName.toLowerCase()
}

function refineWithNthOfType(selector: string, element: Element, depth: number): string {
  const parts = selector.split(' > ')
  const target = parts.at(-1) ?? ''
  if (target.includes(':nth-of-type')) return selector
  const tag = element.tagName.toLowerCase()
  const parent = element.parentElement
  if (parent === null) return selector
  const sameTagSiblings = [...parent.children].filter((child) => child.tagName === element.tagName)
  const ordinal = sameTagSiblings.indexOf(element) + 1
  const refined = `${tag}:nth-of-type(${ordinal})`
  parts[parts.length - 1] = refined
  return parts.join(' > ')
}

/** The picker UI root (toolbar + panel + highlight). */
export interface PickerController {
  /** Enter or leave pick mode. */
  toggle(): void
  /** Whether pick mode is active. */
  active(): boolean
  /** Show/hide the whole toolbar (settings-row master switch). */
  setVisible(visible: boolean): void
  /** Remove all owned DOM. */
  dispose(): void
}

const PANEL_STYLE = `
  position: fixed;
  right: 16px;
  bottom: 84px;
  width: min(360px, calc(100vw - 32px));
  max-height: 62vh;
  z-index: 2147483646;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay, #fff);
  color: var(--dsw-alias-label-primary, #111);
  font: 400 13px/1.5 var(--dsw-font-family, system-ui, sans-serif);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
  overflow: auto;
`

/** Word-style format state for one element. */
interface FormatState {
  fill: 'none' | 'solid' | 'gradient'
  color: string
  gradType: 'linear' | 'radial'
  angle: number
  c1: string
  c2: string
  /** 10..100 — gradient span: 100 = full 0%..100%, 10 = narrow mid-band. */
  strength: number
  soft: boolean
  /** Blur radius in px (soft-edge intensity). */
  blur: number
  /** Shadow spread in px (soft-edge range). */
  spread: number
}

function defaultFormat(): FormatState {
  return {
    fill: 'solid',
    color: '#6366f1',
    gradType: 'linear',
    angle: 45,
    c1: '#a78bfa',
    c2: '#6366f1',
    strength: 100,
    soft: false,
    blur: 12,
    spread: 6,
  }
}

/** Result of building CSS for a format state, with optional companion
 * rules (bordered-ancestor suppression for the soft edge, fade-layer
 * suppression for painted containers). */
interface FormatResult {
  css: string
  extra?: Array<{ selector: string; css: string }>
}

/** Fill value without the `background:` prefix (for layering). */
function fillValue(state: FormatState): string {
  if (state.fill === 'solid') return state.color
  if (state.fill === 'gradient') {
    const start = Math.max(0, Math.round((100 - state.strength) / 2))
    const end = 100 - start
    if (state.gradType === 'linear') {
      return `linear-gradient(${state.angle}deg, ${state.c1} ${start}%, ${state.c2} ${end}%)`
    }
    return `radial-gradient(circle, ${state.c1} ${start}%, ${state.c2} ${end}%)`
  }
  return 'none'
}

/**
 * The nearest ancestor (or the element's backdrop) that has a visible
 * background — the color the soft edge should feather INTO.
 */
function findEdgeColor(element: Element): string {
  let current: Element | null = element.parentElement
  while (current !== null && current !== document.documentElement) {
    const bg = getComputedStyle(current).backgroundColor
    if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
    current = current.parentElement
  }
  return 'rgba(0, 0, 0, 0)'
}

/** Build the CSS declaration block text for a format state. Generated
 * declarations carry `!important` — the pane is Word-style "make it so":
 * product rules (e.g. the sidebar column's own background) would otherwise
 * out-specify the generated selectors. Hand-edits in the textarea stay as
 * written. */
function buildFormat(state: FormatState, element: Element, selector: string): FormatResult {
  const declarations: string[] = []
  const softWidth = state.soft ? state.blur + state.spread : 0
  if (state.fill === 'none') {
    declarations.push('background: none !important;')
  } else if (state.soft && softWidth > 0) {
    // Feather the fill into the underlying surface color across the soft
    // width: a top layer fades transparent -> edgeColor at the right edge,
    // so the painted region dissolves instead of ending in a hard color
    // seam (the real "divider line" is the color contrast, not the 1px
    // border). Left edge stays solid; right edge feathers.
    const edge = findEdgeColor(element)
    declarations.push(
      `background:\n  linear-gradient(to right, transparent 0%, transparent calc(100% - ${softWidth}px), ${edge} 100%),\n  ${fillValue(state)} !important;`,
    )
  } else {
    declarations.push(`background: ${fillValue(state)} !important;`)
  }
  if (state.soft) {
    const base = state.fill === 'solid' ? state.color
      : state.fill === 'gradient' ? state.c2
        : 'rgba(0, 0, 0, 0.35)'
    // Inner shadow is the workhorse: outer box-shadows are clipped by
    // overflow:hidden containers (sidebar column, cards), so the visible
    // soft edge must come from an inset shadow. The inset color must
    // CONTRAST with the fill — a same-color translucent ring is invisible
    // (alpha blending over an opaque fill changes no RGB pixel). A soft
    // white veil lifts the edge band; the outer shadow adds colored glow
    // where the container does not clip.
    declarations.push(
      `box-shadow: inset 0 0 ${state.blur}px ${state.spread}px color-mix(in srgb, #ffffff 55%, transparent), 0 0 ${state.blur}px ${state.spread}px color-mix(in srgb, ${base} 70%, transparent) !important;`,
    )
  }
  const extras: Array<{ selector: string; css: string }> = []
  if (state.soft) {
    const softEdge = buildSoftEdgeExtra(state, element, softWidth)
    if (softEdge !== null) extras.push(softEdge)
  }
  const fadeSuppression = buildFadeSuppression(element, selector)
  if (fadeSuppression !== null) extras.push(fadeSuppression)
  return { css: declarations.join('\n'), extra: extras.length > 0 ? extras : undefined }
}

/**
 * Companion rule that strips product fade layers inside the painted
 * container (e.g. the sidebar's list-bottom `[class*='fade']` span, a white
 * gradient veil sitting above the settings footer). The fade is pure
 * decoration (the maid skin removes it the same way); without this rule it
 * paints over the user's fill, leaving a pale band.
 */
function buildFadeSuppression(
  element: Element,
  selector: string,
): { selector: string; css: string } | null {
  if (element.querySelector('[class*="fade"]') === null) return null
  return {
    selector: `${selector} [class*='fade']`,
    css: 'background: none !important;',
  }
}

/**
 * Companion rule for the soft edge: panel divider lines (e.g. the sidebar
 * column's `border-right`) live on ANCESTORS of the painted element, where
 * the element's own inset shadow cannot reach. Walk the ancestor chain and
 * target the NEAREST ancestor that actually has a visible border: make its
 * border transparent AND feather its own background out at the right edge,
 * so the painted region blends through it into the app surface instead of
 * ending at a hard color seam.
 */
function buildSoftEdgeExtra(
  state: FormatState,
  element: Element,
  softWidth: number,
): { selector: string; css: string } | null {
  let current = element.parentElement
  let depth = 0
  while (current !== null && current !== document.body && current !== document.documentElement && depth < 5) {
    const cs = getComputedStyle(current)
    const hasVisibleBorder = (['Left', 'Right', 'Top', 'Bottom'] as const).some((side) => {
      const width = parseFloat(cs[`border${side}Width`])
      const color = cs[`border${side}Color`]
      return width > 0 && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent'
    })
    if (hasVisibleBorder) {
      const declarations = ['border-color: transparent !important;']
      const selfBg = cs.backgroundColor
      if (softWidth > 0 && selfBg !== 'rgba(0, 0, 0, 0)' && selfBg !== 'transparent') {
        declarations.push(
          `background: linear-gradient(to right, ${selfBg} 0%, ${selfBg} calc(100% - ${softWidth}px), transparent 100%) !important;`,
        )
      }
      declarations.push(
        `box-shadow: inset 0 0 ${state.blur}px ${state.spread}px color-mix(in srgb, #ffffff 55%, transparent) !important;`,
      )
      return {
        selector: generateSelector(current),
        css: declarations.join('\n'),
      }
    }
    current = current.parentElement
    depth += 1
  }
  return null
}

/** UI preferences kept OUT of the theme scheme (not exported with it). */
const UI_KEY = 'dsh.skin-studio.ui'

interface ToolbarUi {
  visible: boolean
  x: number | null
  y: number | null
}

function loadToolbarUi(): ToolbarUi {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (raw === null) return { visible: true, x: null, y: null }
    const parsed = JSON.parse(raw) as Partial<ToolbarUi>
    return {
      visible: parsed.visible !== false,
      x: typeof parsed.x === 'number' ? parsed.x : null,
      y: typeof parsed.y === 'number' ? parsed.y : null,
    }
  } catch {
    return { visible: true, x: null, y: null }
  }
}

function saveToolbarUi(ui: ToolbarUi): void {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(ui))
  } catch {
    // non-fatal
  }
}

export function mountPicker(): PickerController {
  let picking = false
  let painting = false
  let paintColor = '#6366f1'
  let highlightEl: HTMLDivElement | null = null
  let panelEl: HTMLDivElement | null = null
  let previewTag: HTMLStyleElement | null = null
  let hovered: Element | null = null
  let captured: Element | null = null
  let flashTimers: ReturnType<typeof setTimeout>[] = []

  // ---- toolbar ----
  const toolbar = document.createElement('div')
  toolbar.dataset.skinStudioPicker = 'toolbar'
  toolbar.style.cssText = TOOLBAR_STYLE

  // drag handle: reposition the toolbar anywhere in the viewport
  const handle = document.createElement('span')
  handle.dataset.skinStudioPicker = 'handle'
  handle.textContent = '⠿'
  handle.title = '拖动调整位置'
  handle.style.cssText = `
    cursor: grab;
    user-select: none;
    padding: 0 4px;
    color: var(--dsw-alias-label-tertiary, #888);
    font-size: 13px;
    line-height: 1;
  `
  toolbar.append(handle)

  const pickBtn = document.createElement('button')
  pickBtn.type = 'button'
  pickBtn.dataset.skinStudioPicker = 'toggle'
  pickBtn.textContent = '🎨 拾取'
  pickBtn.style.cssText = TOOL_BUTTON_STYLE
  toolbar.append(pickBtn)

  const paintBtn = document.createElement('button')
  paintBtn.type = 'button'
  paintBtn.dataset.skinStudioPicker = 'paint'
  paintBtn.textContent = '🖌️ 涂色'
  paintBtn.style.cssText = TOOL_BUTTON_STYLE
  toolbar.append(paintBtn)

  const colorInput = document.createElement('input')
  colorInput.type = 'color'
  colorInput.dataset.skinStudioPicker = 'color'
  colorInput.value = paintColor
  colorInput.title = '涂色使用的颜色'
  colorInput.style.cssText = `
    width: 30px;
    height: 26px;
    padding: 0;
    border: 1px solid var(--dsw-alias-border-l2, #ccc);
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
  `
  colorInput.addEventListener('input', () => {
    paintColor = colorInput.value
  })
  toolbar.append(colorInput)

  // ---- visibility (master switch from the settings row) ----
  let ui = loadToolbarUi()
  const setVisibleImpl = (visible: boolean): void => {
    ui = { ...ui, visible }
    toolbar.style.display = visible ? 'flex' : 'none'
    saveToolbarUi(ui)
    if (!visible) {
      setPicking(false)
      setPainting(false)
      closePanel()
      hideHighlight()
    }
  }

  // ---- dragging ----
  const applyPosition = (): void => {
    if (ui.x !== null && ui.y !== null) {
      toolbar.style.right = 'auto'
      toolbar.style.bottom = 'auto'
      toolbar.style.left = `${ui.x}px`
      toolbar.style.top = `${ui.y}px`
    }
  }
  applyPosition()

  let dragging = false
  let dragOffsetX = 0
  let dragOffsetY = 0
  let dragMoved = false

  const onDragMove = (event: PointerEvent): void => {
    if (!dragging) return
    event.preventDefault()
    const x = Math.max(8, Math.min(window.innerWidth - 60, event.clientX - dragOffsetX))
    const y = Math.max(8, Math.min(window.innerHeight - 44, event.clientY - dragOffsetY))
    toolbar.style.right = 'auto'
    toolbar.style.bottom = 'auto'
    toolbar.style.left = `${x}px`
    toolbar.style.top = `${y}px`
    dragMoved = true
  }

  const onDragUp = (): void => {
    if (!dragging) return
    dragging = false
    handle.style.cursor = 'grab'
    if (dragMoved) {
      ui = { ...ui, x: parseFloat(toolbar.style.left), y: parseFloat(toolbar.style.top) }
      saveToolbarUi(ui)
    }
    window.removeEventListener('pointermove', onDragMove, true)
    window.removeEventListener('pointerup', onDragUp, true)
  }

  handle.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const rect = toolbar.getBoundingClientRect()
    dragging = true
    dragMoved = false
    dragOffsetX = event.clientX - rect.left
    dragOffsetY = event.clientY - rect.top
    handle.style.cursor = 'grabbing'
    window.addEventListener('pointermove', onDragMove, true)
    window.addEventListener('pointerup', onDragUp, true)
  })

  document.body.append(toolbar)

  // ---- highlight ----
  const onMove = (event: PointerEvent): void => {
    if (!picking && !painting) return
    const target = event.target instanceof Element ? event.target : null
    if (target === null || target.closest(`[${PICKER_ATTR}]`) !== null) {
      hideHighlight()
      return
    }
    hovered = target
    if (highlightEl === null) {
      highlightEl = document.createElement('div')
      highlightEl.dataset.skinStudioPicker = 'highlight'
      highlightEl.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 2147483645;
        pointer-events: none;
        border: 2px dashed #f59e0b;
        background: rgba(245, 158, 11, 0.10);
        border-radius: 4px;
        box-sizing: border-box;
      `
      document.body.append(highlightEl)
    }
    const rect = target.getBoundingClientRect()
    highlightEl.style.left = `${rect.left}px`
    highlightEl.style.top = `${rect.top}px`
    highlightEl.style.width = `${rect.width}px`
    highlightEl.style.height = `${rect.height}px`
    highlightEl.style.display = 'block'
  }

  const hideHighlight = (): void => {
    if (highlightEl !== null) highlightEl.style.display = 'none'
    hovered = null
  }

  const clearFlash = (): void => {
    for (const timer of flashTimers) clearTimeout(timer)
    flashTimers = []
  }

  /** Brief green outline on a freshly painted element. */
  const flash = (element: Element): void => {
    const target = element instanceof HTMLElement ? element : element.parentElement
    if (target === null) return
    target.style.outline = '2px solid #22c55e'
    target.style.outlineOffset = '2px'
    flashTimers.push(window.setTimeout(() => {
      target.style.outline = ''
      target.style.outlineOffset = ''
    }, 450))
  }

  // ---- paint mode (quick solid fill, Word "quick style" style) ----
  const paintTarget = (element: Element): Element => {
    let current: Element | null = element
    while (current !== null && current !== document.documentElement) {
      const bg = getComputedStyle(current).backgroundColor
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return current
      current = current.parentElement
    }
    return element
  }

  const paintAt = (element: Element): void => {
    const target = paintTarget(element)
    const selector = generateSelector(target)
    const fadeSuppression = buildFadeSuppression(target, selector)
    store.update((current) => {
      const rest = current.rules.filter((rule) => rule.selector !== selector)
      return {
        rules: [
          ...rest,
          {
            selector,
            css: `background: ${paintColor} !important;`,
            extra: fadeSuppression !== null ? [fadeSuppression] : undefined,
          },
        ],
      }
    })
    flash(target)
  }

  // ---- format pane (Word-style) ----
  const clearPreview = (): void => {
    previewTag?.remove()
    previewTag = null
  }

  const setPreview = (selector: string, css: string): void => {
    if (previewTag === null) {
      previewTag = document.createElement('style')
      previewTag.dataset.pluginCss = 'ui-skin-studio/picker-preview'
      document.head.append(previewTag)
    }
    previewTag.textContent = selector === '' || css === ''
      ? ''
      : `${selector} {\n${css}\n}`
  }

  /** Save the current pane state as the rule for the given selector. */
  const commitRule = (selector: string, css: string, extra?: { selector: string; css: string }): void => {
    const sel = selector.trim()
    if (sel === '') return
    store.update((current) => {
      const rest = current.rules.filter((rule) => rule.selector !== sel)
      return { rules: [...rest, { selector: sel, css, extra }] }
    })
  }

  const openPanel = (element: Element): void => {
    captured = element
    closePanel()
    const selector = generateSelector(element)
    const existing = store.get().rules.find((rule) => rule.selector === selector)
    // Inherit the toolbar color-picker's current color so "pick -> fill" uses
    // whatever the user last chose, instead of resetting to the default.
    const state: FormatState = { ...defaultFormat(), color: paintColor, c2: paintColor }

    panelEl = document.createElement('div')
    panelEl.dataset.skinStudioPicker = 'panel'
    panelEl.style.cssText = PANEL_STYLE

    // header
    const header = document.createElement('div')
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;'
    header.textContent = '格式窗格'
    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.textContent = '✕'
    closeBtn.style.cssText = 'border:0;background:transparent;cursor:pointer;color:inherit;font-size:14px;'
    closeBtn.addEventListener('click', () => {
      closePanel()
      hideHighlight()
    })
    header.append(closeBtn)
    panelEl.append(header)

    // selector
    const selHint = document.createElement('div')
    selHint.textContent = '选择器（稳定钩子优先，修改后即时生效）'
    selHint.style.cssText = 'color:var(--dsw-alias-label-tertiary,#888);font-size:12px;'
    panelEl.append(selHint)

    const selectorInput = document.createElement('input')
    selectorInput.value = selector
    selectorInput.spellcheck = false
    selectorInput.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      border: 1px solid var(--dsw-alias-border-l1,#ddd);
      border-radius: 6px;
      background: var(--dsw-alias-bg-layer-1,#fafafa);
      color: inherit;
      font: 500 12px/1.4 var(--ds-font-family-code, monospace);
    `
    panelEl.append(selectorInput)

    // ---- fill type ----
    const section = (title: string): HTMLDivElement => {
      const div = document.createElement('div')
      div.style.cssText = 'display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--dsw-alias-border-l1,#ddd);padding-top:8px;'
      const label = document.createElement('div')
      label.textContent = title
      label.style.cssText = 'color:var(--dsw-alias-label-secondary,#666);font-size:12px;font-weight:600;'
      div.append(label)
      return div
    }

    const fillSection = section('填充')
    const fillRow = document.createElement('div')
    fillRow.style.cssText = 'display:flex;gap:6px;'
    const fillButtons: Record<FormatState['fill'], HTMLButtonElement> = {
      none: segBtn('无', 'none'),
      solid: segBtn('纯色', 'solid'),
      gradient: segBtn('渐变', 'gradient'),
    }
    for (const [key, btn] of Object.entries(fillButtons)) {
      fillRow.append(btn)
    }
    fillSection.append(fillRow)
    panelEl.append(fillSection)

    // solid color row
    const solidRow = document.createElement('div')
    solidRow.style.cssText = 'display:flex;align-items:center;gap:8px;'
    const solidColor = colorPicker(state.color, (value) => {
      state.color = value
      paintColor = value
      colorInput.value = value
      refresh()
    })
    const solidLabel = document.createElement('span')
    solidLabel.textContent = '颜色'
    solidLabel.style.cssText = 'color:var(--dsw-alias-label-tertiary,#888);font-size:12px;'
    solidRow.append(solidColor, solidLabel)
    fillSection.append(solidRow)

    // gradient controls
    const gradSection = section('渐变')
    const gradTypeRow = document.createElement('div')
    gradTypeRow.style.cssText = 'display:flex;gap:6px;'
    const gradTypeButtons: Record<FormatState['gradType'], HTMLButtonElement> = {
      linear: segBtn('线性', 'linear'),
      radial: segBtn('径向', 'radial'),
    }
    for (const btn of Object.values(gradTypeButtons)) gradTypeRow.append(btn)
    gradSection.append(gradTypeRow)

    const angleRow = sliderRow('方向角度', 0, 360, state.angle, (value) => {
      state.angle = value
      refresh()
    })
    gradSection.append(angleRow)

    const c1Row = document.createElement('div')
    c1Row.style.cssText = 'display:flex;align-items:center;gap:8px;'
    const c1Picker = colorPicker(state.c1, (value) => {
      state.c1 = value
      refresh()
    })
    const c1Label = document.createElement('span')
    c1Label.textContent = '起始色'
    c1Label.style.cssText = 'color:var(--dsw-alias-label-tertiary,#888);font-size:12px;'
    c1Row.append(c1Picker, c1Label)
    gradSection.append(c1Row)

    const c2Row = document.createElement('div')
    c2Row.style.cssText = 'display:flex;align-items:center;gap:8px;'
    const c2Picker = colorPicker(state.c2, (value) => {
      state.c2 = value
      paintColor = value
      colorInput.value = value
      refresh()
    })
    const c2Label = document.createElement('span')
    c2Label.textContent = '结束色'
    c2Label.style.cssText = 'color:var(--dsw-alias-label-tertiary,#888);font-size:12px;'
    c2Row.append(c2Picker, c2Label)
    gradSection.append(c2Row)

    const strengthRow = sliderRow('渐变强度', 10, 100, state.strength, (value) => {
      state.strength = value
      refresh()
    })
    gradSection.append(strengthRow)
    panelEl.append(gradSection)

    // soft edge section
    const softSection = section('边缘柔化')
    const softRow = document.createElement('div')
    softRow.style.cssText = 'display:flex;align-items:center;gap:8px;'
    const softToggle = document.createElement('input')
    softToggle.type = 'checkbox'
    softToggle.checked = state.soft
    softToggle.addEventListener('change', () => {
      state.soft = softToggle.checked
      refresh()
    })
    const softLabel = document.createElement('span')
    softLabel.textContent = '启用柔化'
    softLabel.style.cssText = 'color:var(--dsw-alias-label-secondary,#666);font-size:13px;'
    softRow.append(softToggle, softLabel)
    softSection.append(softRow)

    const blurRow = sliderRow('模糊强度', 0, 60, state.blur, (value) => {
      state.blur = value
      refresh()
    })
    softSection.append(blurRow)

    const spreadRow = sliderRow('模糊范围', 0, 60, state.spread, (value) => {
      state.spread = value
      refresh()
    })
    softSection.append(spreadRow)
    panelEl.append(softSection)

    // generated css (editable)
    const cssLabel = document.createElement('div')
    cssLabel.textContent = '生成的 CSS（可手动微调，改动即生效）'
    cssLabel.style.cssText = 'color:var(--dsw-alias-label-tertiary,#888);font-size:12px;border-top:1px solid var(--dsw-alias-border-l1,#ddd);padding-top:8px;'
    panelEl.append(cssLabel)

    const cssInput = document.createElement('textarea')
    cssInput.value = existing?.css ?? buildFormat(state, element, selector).css
    cssInput.spellcheck = false
    cssInput.rows = 5
    cssInput.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      border: 1px solid var(--dsw-alias-border-l1,#ddd);
      border-radius: 6px;
      background: var(--dsw-alias-bg-layer-1,#fafafa);
      color: inherit;
      font: 400 12px/1.5 var(--ds-font-family-code, monospace);
      resize: vertical;
    `
    panelEl.append(cssInput)

    // actions
    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;'

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.textContent = '删除'
    removeBtn.style.cssText = btnStyle('var(--dsw-alias-bg-layer-2,#eee)', 'inherit')
    removeBtn.addEventListener('click', () => {
      store.update((current) => ({
        rules: current.rules.filter((rule) => rule.selector !== selectorInput.value.trim()),
      }))
      closePanel()
      hideHighlight()
    })
    actions.append(removeBtn)

    const doneBtn = document.createElement('button')
    doneBtn.type = 'button'
    doneBtn.textContent = '完成'
    doneBtn.style.cssText = btnStyle('#6366f1', '#fff')
    doneBtn.addEventListener('click', () => {
      closePanel()
      hideHighlight()
    })
    actions.append(doneBtn)

    panelEl.append(actions)
    document.body.append(panelEl)

    // ---- wiring ----
    const currentCss = (): string => cssInput.value.trim()

    const refresh = (): void => {
      // regenerate css from state unless the user is hand-editing
      const result = buildFormat(state, element, selectorInput.value)
      cssInput.value = result.css
      syncUi()
      commitRule(selectorInput.value, result.css, result.extra)
      setPreview(selectorInput.value, currentCss())
    }

    const syncUi = (): void => {
      const fill = state.fill
      for (const [key, btn] of Object.entries(fillButtons)) {
        btn.style.cssText = TOOL_BUTTON_STYLE + (key === fill ? ACTIVE_BUTTON_STYLE : '')
      }
      for (const [key, btn] of Object.entries(gradTypeButtons)) {
        btn.style.cssText = TOOL_BUTTON_STYLE + (key === state.gradType ? ACTIVE_BUTTON_STYLE : '')
      }
      solidRow.style.display = fill === 'solid' ? 'flex' : 'none'
      gradSection.style.display = fill === 'gradient' ? 'flex' : 'none'
      angleRow.style.display = fill === 'gradient' && state.gradType === 'linear' ? 'flex' : 'none'
      blurRow.style.display = state.soft ? 'flex' : 'none'
      spreadRow.style.display = state.soft ? 'flex' : 'none'
    }

    const syncSliderLabels = (): void => {
      const pairs: [HTMLInputElement, HTMLElement][] = [
        [angleRow.querySelector('input'), angleRow.querySelector('.value')],
      ]
      for (const [input, valueEl] of pairs) {
        if (input !== null && valueEl !== null) valueEl.textContent = `${input.value}°`
      }
      const strengthInput = strengthRow.querySelector('input')
      const strengthValue = strengthRow.querySelector('.value')
      if (strengthInput !== null && strengthValue !== null) strengthValue.textContent = `${strengthInput.value}%`
      const blurInput = blurRow.querySelector('input')
      const blurValue = blurRow.querySelector('.value')
      if (blurInput !== null && blurValue !== null) blurValue.textContent = `${blurInput.value}px`
      const spreadInput = spreadRow.querySelector('input')
      const spreadValue = spreadRow.querySelector('.value')
      if (spreadInput !== null && spreadValue !== null) spreadValue.textContent = `${spreadInput.value}px`
    }
    syncSliderLabels()
    syncUi()

    // selector edits re-key the rule
    selectorInput.addEventListener('input', () => {
      commitRule(selectorInput.value, currentCss())
      setPreview(selectorInput.value, currentCss())
    })
    // manual css edits apply live
    cssInput.addEventListener('input', () => {
      commitRule(selectorInput.value, currentCss())
      setPreview(selectorInput.value, currentCss())
    })

    // seg buttons
    for (const [key, btn] of Object.entries(fillButtons)) {
      btn.addEventListener('click', () => {
        state.fill = key as FormatState['fill']
        refresh()
      })
    }
    for (const [key, btn] of Object.entries(gradTypeButtons)) {
      btn.addEventListener('click', () => {
        state.gradType = key as FormatState['gradType']
        refresh()
      })
    }

    // show the existing rule's preview immediately. First visit (no rule
    // yet): fill right away with the toolbar color-picker's color — "pick an
    // element" means "paint it" — and keep the pane open for fine-tuning.
    if (existing === undefined) {
      const result = buildFormat(state, element, selector)
      commitRule(selector, result.css, result.extra)
    }
    setPreview(selector, existing?.css ?? buildFormat(state, element, selector).css)
    selectorInput.focus()
    selectorInput.select()

    function segBtn(text: string, _key: string): HTMLButtonElement {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = text
      btn.style.cssText = TOOL_BUTTON_STYLE
      return btn
    }

    function colorPicker(initial: string, onChange: (value: string) => void): HTMLInputElement {
      const input = document.createElement('input')
      input.type = 'color'
      input.value = initial
      input.style.cssText = 'width:30px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;background:transparent;cursor:pointer;'
      input.addEventListener('input', () => onChange(input.value))
      return input
    }

    function sliderRow(
      labelText: string,
      min: number,
      max: number,
      initial: number,
      onChange: (value: number) => void,
    ): HTMLDivElement {
      const row = document.createElement('div')
      row.style.cssText = 'display:flex;align-items:center;gap:8px;'
      const label = document.createElement('span')
      label.textContent = labelText
      label.style.cssText = 'color:var(--dsw-alias-label-tertiary,#888);font-size:12px;flex:none;'
      const input = document.createElement('input')
      input.type = 'range'
      input.min = String(min)
      input.max = String(max)
      input.value = String(initial)
      input.style.cssText = 'flex:1;min-width:0;'
      const value = document.createElement('span')
      value.className = 'value'
      value.textContent = String(initial)
      value.style.cssText = 'color:var(--dsw-alias-label-tertiary,#888);font-size:12px;flex:none;width:34px;text-align:right;'
      input.addEventListener('input', () => {
        const next = Number(input.value)
        value.textContent = labelText.includes('方向') ? `${next}°` : labelText.includes('强度') ? `${next}%` : `${next}px`
        onChange(next)
      })
      row.append(label, input, value)
      return row
    }
  }

  const closePanel = (): void => {
    clearPreview()
    panelEl?.remove()
    panelEl = null
    captured = null
  }

  // ---- global capture handlers ----
  const onClick = (event: PointerEvent): void => {
    if (!picking && !painting) return
    const target = event.target instanceof Element ? event.target : null
    // Toolbar/panel clicks must pass through to their own listeners — the
    // capture-phase intercept must NOT swallow them (that would make the
    // cancel buttons dead while a mode is active).
    if (target === null || target.closest(`[${PICKER_ATTR}]`) !== null) return
    event.preventDefault()
    event.stopPropagation()
    hideHighlight()
    if (painting) {
      paintAt(target)
    } else {
      setPicking(false)
      openPanel(target)
    }
  }

  const onKey = (event: KeyboardEvent): void => {
    if (!picking && !painting) return
    if (event.key === 'Escape') {
      event.preventDefault()
      setPicking(false)
      setPainting(false)
      hideHighlight()
      closePanel()
    }
  }

  // ---- mode switches (mutually exclusive) ----
  const setPicking = (next: boolean): void => {
    if (next) setPainting(false)
    picking = next
    pickBtn.textContent = next ? '✕ 取消' : '🎨 拾取'
    pickBtn.style.cssText = TOOL_BUTTON_STYLE + (next ? ACTIVE_BUTTON_STYLE : '')
    if (!next) hideHighlight()
  }

  const setPainting = (next: boolean): void => {
    if (next) {
      setPicking(false)
      closePanel()
    }
    painting = next
    paintBtn.textContent = next ? '✕ 取消' : '🖌️ 涂色'
    paintBtn.style.cssText = TOOL_BUTTON_STYLE + (next ? ACTIVE_BUTTON_STYLE : '')
    if (!next) hideHighlight()
  }

  pickBtn.addEventListener('click', () => {
    if (picking) {
      setPicking(false)
      hideHighlight()
      closePanel()
    } else {
      setPicking(true)
    }
  })

  paintBtn.addEventListener('click', () => {
    if (painting) {
      setPainting(false)
      hideHighlight()
    } else {
      setPainting(true)
    }
  })

  document.addEventListener('pointermove', onMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKey, true)

  // apply persisted visibility AFTER all helpers are defined (TDZ-safe)
  setVisibleImpl(ui.visible)

  return {
    toggle() {
      setPicking(!picking)
    },
    active() {
      return picking
    },
    setVisible(visible: boolean) {
      setVisibleImpl(visible)
    },
    dispose() {
      setPicking(false)
      setPainting(false)
      closePanel()
      hideHighlight()
      clearFlash()
      highlightEl?.remove()
      toolbar.remove()
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKey, true)
    },
  }
}

function btnStyle(bg: string, color: string): string {
  return `
    padding: 6px 12px;
    border: 1px solid var(--dsw-alias-border-l2,#ccc);
    border-radius: 8px;
    background: ${bg};
    color: ${color};
    font: 600 12px/1 var(--dsw-font-family, system-ui, sans-serif);
    cursor: pointer;
  `
}

let pickerController: PickerController | null = null

/** Read the persisted toolbar visibility (settings-row checkbox initial state). */
export function getToolbarVisible(): boolean {
  return loadToolbarUi().visible
}

/** Lazily mount and return the singleton picker controller. */
export function getPicker(): PickerController {
  if (pickerController === null) pickerController = mountPicker()
  return pickerController
}
