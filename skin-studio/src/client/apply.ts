/** Apply engine: turns the persisted scheme into live theme overrides. */

import { store } from './store.ts'
import { withAlpha } from './tokens.ts'
import type { Scheme, TokenPair } from './types.ts'

/**
 * ThemeRuntime service (provided by @deepseek-ai/dsh-client-ui-theme).
 * We only use the overrideTokens surface, so a minimal structural type keeps
 * this bundle free of a cross-plugin value import.
 */
export interface ThemeService {
  overrideTokens(
    source: string,
    tokens: Record<string, TokenPair>,
  ): () => void
}

const SOURCE = 'ui-skin-studio'

/** Opaque palette bases used when the background image is enabled. */
const SURFACE_BASES = {
  '--dsw-alias-bg-base': { light: 'rgb(255, 255, 255)', dark: 'rgb(15, 15, 15)' },
  '--dsw-alias-bg-layer-1': { light: 'rgb(250, 250, 250)', dark: 'rgb(24, 24, 26)' },
  '--dsw-alias-bg-layer-2': { light: 'rgb(245, 245, 245)', dark: 'rgb(30, 30, 33)' },
  '--dsw-alias-bg-overlay': { light: 'rgb(255, 255, 255)', dark: 'rgb(27, 27, 28)' },
  '--dsw-specific-sidebar-fill': { light: 'rgb(245, 246, 247)', dark: 'rgb(21, 21, 23)' },
} as const

/**
 * Surface translucency per token (higher = more opaque).
 * NOTE on stacking: the app paints several translucent layers over the
 * backdrop (body + frame + conversation root all read bg-base), and alpha
 * multiplies. Three 0.8 layers leave only ~4% of the image visible — that is
 * why backgrounds looked "hidden under the chat". These values are tuned so
 * the stacked conversation area shows the image clearly while single-layer
 * surfaces (sidebar, cards, popovers) keep a glass feel.
 */
const SURFACE_ALPHA: Record<keyof typeof SURFACE_BASES, number> = {
  '--dsw-alias-bg-base': 0.45,
  '--dsw-alias-bg-layer-1': 0.7,
  '--dsw-alias-bg-layer-2': 0.75,
  '--dsw-alias-bg-overlay': 0.85,
  '--dsw-specific-sidebar-fill': 0.72,
}

/** Build the translucent-surface token pairs for the background layer. */
function translucentSurfaces(): Record<string, TokenPair> {
  const tokens: Record<string, TokenPair> = {}
  for (const [variable, bases] of Object.entries(SURFACE_BASES)) {
    const alpha = SURFACE_ALPHA[variable as keyof typeof SURFACE_BASES]
    tokens[variable] = {
      light: withAlpha(bases.light, alpha),
      dark: withAlpha(bases.dark, alpha),
    }
  }
  return tokens
}

/** Compose the final token layer: translucent defaults, then user overrides. */
export function composeTokens(scheme: Scheme): Record<string, TokenPair> {
  const tokens: Record<string, TokenPair> = {}
  const hasBackground = scheme.background.enabled
    && scheme.background.layers.some((layer) => layer.visible && layer.kind === 'image' && layer.image !== '')
  if (hasBackground) {
    Object.assign(tokens, translucentSurfaces())
  }
  for (const [name, pair] of Object.entries(scheme.tokens)) {
    tokens[name] = pair
  }
  return tokens
}

/** Build the injected stylesheet text for the current scheme. */
export function buildCss(scheme: Scheme): string {
  const parts: string[] = []

  if (scheme.css.trim() !== '') {
    parts.push(`/* ==== user css ==== */\n${scheme.css}`)
  }

  if (scheme.rules.length > 0) {
    parts.push(`/* ==== element picker rules ==== */`)
    for (const rule of scheme.rules) {
      if (rule.selector.trim() === '') continue
      parts.push(`${rule.selector} {\n${rule.css}\n}`)
      if (rule.extra != null) {
        for (const ex of rule.extra) {
          if (ex.selector.trim() !== '') {
            parts.push(`${ex.selector} {\n${ex.css}\n}`)
          }
        }
      }
    }
  }

  return parts.join('\n\n')
}

/** Cache of decoded image sizes (data URLs decode once). */
const imageSizeCache = new Map<string, { w: number; h: number }>()

function loadImageSize(src: string): Promise<{ w: number; h: number } | null> {
  const cached = imageSizeCache.get(src)
  if (cached !== undefined) return Promise.resolve(cached)
  return new Promise((resolve) => {
    const probe = new Image()
    probe.onload = () => {
      const size = { w: probe.naturalWidth, h: probe.naturalHeight }
      imageSizeCache.set(src, size)
      resolve(size)
    }
    probe.onerror = () => resolve(null)
    probe.src = src
  })
}

/**
 * Render a contain/custom layer as a real <img> element. Two problems with
 * the background-image approach:
 * 1. contain pins one axis to the viewport, so that axis has ZERO movement
 *    room (`top = posY% * (vh - imgH)` = 0 when imgH == vh) — users could
 *    never move the image up/down.
 * 2. the feather mask applied to the full-viewport div feathers the
 *    VIEWPORT edges; a contained image does not reach the viewport's left
 *    and right edges, so its left/right edges were never feathered.
 * An <img> is positioned by its CENTER (center-anchored: left = posX% * vw
 * - w/2), which always has movement range, and the mask/blur/opacity apply
 * to the image box itself, so feathering follows the IMAGE edges.
 */
async function renderImageLayer(layer: HTMLDivElement, entry: BackgroundLayer): Promise<void> {
  const size = await loadImageSize(entry.image)
  if (size === null) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  let w: number
  let h: number
  if (entry.size === 'contain') {
    const scale = Math.min(vw / size.w, vh / size.h)
    w = size.w * scale
    h = size.h * scale
  } else {
    const s = Math.max(1, Math.min(300, entry.scale)) / 100
    w = vw * s
    h = w * size.h / size.w
  }
  const left = ((entry.posX ?? 50) / 100) * vw - w / 2
  const top = ((entry.posY ?? 50) / 100) * vh - h / 2

  let img = layer.querySelector<HTMLImageElement>('img')
  if (img === null) {
    img = document.createElement('img')
    img.alt = ''
    img.style.position = 'absolute'
    layer.append(img)
  }
  img.src = entry.image
  img.style.left = `${left}px`
  img.style.top = `${top}px`
  img.style.width = `${w}px`
  img.style.height = `${h}px`

  const blur = Math.max(0, Math.min(60, entry.blur))
  const opacity = Math.max(0, Math.min(100, entry.opacity)) / 100
  img.style.filter = blur > 0 ? `blur(${blur}px)` : 'none'
  img.style.opacity = String(opacity)

  const feather = Math.max(0, Math.min(200, entry.feather))
  if (feather > 0) {
    const mask = [
      `linear-gradient(to right, transparent 0, black ${feather}px, black calc(100% - ${feather}px), transparent 100%)`,
      `linear-gradient(to bottom, transparent 0, black ${feather}px, black calc(100% - ${feather}px), transparent 100%)`,
    ].join(', ')
    img.style.maskImage = mask
    img.style.webkitMaskImage = mask
    img.style.maskComposite = 'intersect'
    img.style.webkitMaskComposite = 'source-in'
  } else {
    img.style.maskImage = 'none'
    img.style.webkitMaskImage = 'none'
    img.style.maskComposite = ''
    img.style.webkitMaskComposite = ''
  }
}

/**
 * The background is a layer stack of fixed, pointer-transparent divs.
 * body/html background declarations do not reliably paint under the shell
 * (the app paints an opaque `html` background and body background
 * propagation is blocked), so each layer rides its own fixed div — the same
 * composition maid-style skins use — and the surface tokens are made
 * translucent by the theme override layer so the stack shows through them.
 * The first layer is the TOPMOST (z-index -1); later layers sit below.
 */
function applyLayerStyle(
  layer: HTMLDivElement,
  config: BackgroundConfig,
  index: number,
): void {
  const entry = config.layers[index]
  const visible = config.enabled && entry.visible
  layer.style.display = visible ? 'block' : 'none'
  layer.style.zIndex = String(-1 - index)
  layer.style.overflow = 'hidden'
  if (!visible) return

  const usesImageElement = entry.kind === 'image'
    && entry.image !== ''
    && (entry.size === 'contain' || entry.size === 'custom')
  if (usesImageElement) {
    // <img>-rendered layer: clear background styles, kick the async render.
    layer.style.backgroundImage = 'none'
    layer.style.backgroundColor = 'transparent'
    layer.style.filter = 'none'
    layer.style.opacity = ''
    layer.style.maskImage = 'none'
    layer.style.webkitMaskImage = 'none'
    layer.style.maskComposite = ''
    layer.style.webkitMaskComposite = ''
    void renderImageLayer(layer, entry)
    return
  }
  // background-rendered layer: drop any leftover <img> child.
  layer.querySelector('img')?.remove()

  // background
  if (entry.kind === 'color') {
    layer.style.backgroundImage = 'none'
    layer.style.backgroundColor = entry.color
  } else if (entry.image !== '') {
    layer.style.backgroundColor = 'transparent'
    layer.style.backgroundImage = `url("${entry.image}")`
  } else {
    layer.style.backgroundImage = 'none'
    layer.style.backgroundColor = 'transparent'
  }

  // geometry
  const scale = Math.max(1, Math.min(300, entry.scale)) / 100
  switch (entry.size) {
    case 'cover':
      layer.style.backgroundSize = 'cover'
      layer.style.backgroundRepeat = 'no-repeat'
      break
    case 'stretch':
      layer.style.backgroundSize = '100% 100%'
      layer.style.backgroundRepeat = 'no-repeat'
      break
    case 'repeat':
      layer.style.backgroundSize = 'auto'
      layer.style.backgroundRepeat = 'repeat'
      break
    default:
      layer.style.backgroundSize = 'cover'
      layer.style.backgroundRepeat = 'no-repeat'
      break
  }
  layer.style.backgroundPosition = `${entry.posX ?? 50}% ${entry.posY ?? 50}%`

  // effects
  const blur = Math.max(0, Math.min(60, entry.blur))
  const opacity = Math.max(0, Math.min(100, entry.opacity)) / 100
  layer.style.filter = blur > 0 ? `blur(${blur}px)` : 'none'
  layer.style.opacity = String(opacity)

  // edge feather: two-axis CSS gradient mask intersected. Probe-verified to
  // feather all four sides symmetrically (mask-composite: intersect and the
  // -webkit alias are both emitted; Chrome normalizes the computed value to
  // source-in). SVG data-URL masks were rejected: they do not apply in
  // Chrome when referenced from CSS. For cover/stretch/repeat the image
  // covers the viewport, so viewport-edge feather == image-edge feather.
  const feather = Math.max(0, Math.min(200, entry.feather))
  if (feather > 0) {
    const mask = [
      `linear-gradient(to right, transparent 0, black ${feather}px, black calc(100% - ${feather}px), transparent 100%)`,
      `linear-gradient(to bottom, transparent 0, black ${feather}px, black calc(100% - ${feather}px), transparent 100%)`,
    ].join(', ')
    layer.style.maskImage = mask
    layer.style.webkitMaskImage = mask
    layer.style.maskComposite = 'intersect'
    layer.style.webkitMaskComposite = 'source-in'
    layer.style.maskSize = ''
    layer.style.webkitMaskSize = ''
  } else {
    layer.style.maskImage = 'none'
    layer.style.webkitMaskImage = 'none'
    layer.style.maskSize = ''
    layer.style.webkitMaskSize = ''
    layer.style.maskComposite = ''
    layer.style.webkitMaskComposite = ''
  }
}

/**
 * Reconcile the layer-stack container with the scheme's layers: grow/shrink
 * the owned divs to match, then apply each layer's style. The global
 * darkening veil is a SEPARATE fixed div (never a child of the container —
 * children are addressed by index and a stray child would be treated as a
 * layer).
 */
export function syncBackgroundLayers(
  container: HTMLDivElement,
  veil: HTMLDivElement,
  scheme: Scheme,
): void {
  const config = scheme.background
  const layers = config.enabled ? config.layers : []
  while (container.children.length < layers.length) {
    const div = document.createElement('div')
    div.dataset.skinStudio = 'backdrop-layer'
    div.style.cssText = 'position:fixed;inset:0;pointer-events:none;display:none;'
    container.append(div)
  }
  while (container.children.length > layers.length) {
    container.lastElementChild?.remove()
  }
  for (let index = 0; index < layers.length; index += 1) {
    const div = container.children[index] as HTMLDivElement
    if (div !== undefined) applyLayerStyle(div, config, index)
  }

  if (config.enabled) {
    const mask = Math.max(0, Math.min(0.9, config.overlay)).toFixed(2)
    veil.style.display = 'block'
    veil.style.backgroundImage =
      `linear-gradient(rgba(0, 0, 0, ${mask}), rgba(0, 0, 0, ${mask}))`
  } else {
    veil.style.display = 'none'
  }
}

export interface ApplyHandle {
  /** Recompute and apply everything from the current store state. */
  reapply(): void
  /** Dispose the override layer and remove owned DOM. */
  dispose(): void
}

/**
 * Bind the apply engine to a theme service and the store. Owns:
 * - the `body[data-skin-studio]` marker
 * - the fixed backdrop layer stack for the background
 * - the overrideTokens layer (disposed on dispose())
 * - the user stylesheet <style> element
 * @param theme - the ThemeRuntime service.
 * @returns a handle the caller hangs on its cordis effect.
 */
export function bindApply(theme: ThemeService): ApplyHandle {
  document.body.dataset.skinStudio = ''

  const styleEl = document.createElement('style')
  styleEl.dataset.plugin = SOURCE
  styleEl.dataset.pluginCss = 'ui-skin-studio/user'
  document.head.append(styleEl)

  const backdrop = document.createElement('div')
  backdrop.dataset.skinStudio = 'backdrop'
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;'
  const veil = document.createElement('div')
  veil.dataset.skinStudio = 'backdrop-veil'
  veil.style.cssText = 'position:fixed;inset:0;z-index:-1000;pointer-events:none;display:none;'
  // Append (not prepend): a leading fixed negative-z child does not paint
  // under the shell reliably; trailing placement does. The veil is a
  // sibling of the layer container, never a child (children are indexed).
  document.body.append(backdrop, veil)

  let disposeOverrides: (() => void) | null = null

  const reapply = (): void => {
    const scheme = store.get()
    // Replace the whole layer per source (same-source re-override semantics).
    disposeOverrides?.()
    disposeOverrides = theme.overrideTokens(SOURCE, composeTokens(scheme))
    syncBackgroundLayers(backdrop, veil, scheme)
    styleEl.textContent = buildCss(scheme)
  }

  const offStore = store.subscribe(reapply)
  reapply()

  const dispose = (): void => {
    offStore()
    disposeOverrides?.()
    disposeOverrides = null
    styleEl.remove()
    backdrop.remove()
    veil.remove()
    delete document.body.dataset.skinStudio
  }

  return { reapply, dispose }
}
