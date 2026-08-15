/** Shared scheme types for the skin studio. */

/** A light/dark pair of CSS values for one theme token. */
export interface TokenPair {
  light: string
  dark: string
}

/** One element-picker rule: a stable selector plus raw CSS declarations. */
export interface PickerRule {
  selector: string
  css: string
  /**
   * Optional companion rules rendered after the main rule and removed with
   * it — e.g. the soft-edge pane also targets bordered ancestors so panel
   * divider lines vanish, and painted containers suppress product fade
   * layers (`[class*='fade']`) that would otherwise paint over the fill.
   */
  extra?: Array<{
    selector: string
    css: string
  }>
}

/** How a background layer fits its image into the viewport. */
export type BgSize = 'cover' | 'contain' | 'stretch' | 'custom' | 'repeat'

/** One background layer in the layer stack. List order = paint order:
 * the first layer is the TOPMOST (highest z-index). */
export interface BackgroundLayer {
  id: string
  kind: 'image' | 'color'
  /** Compressed data URL (kind=image). */
  image: string
  /** Solid color (kind=color). */
  color: string
  /** Image fitting mode. */
  size: BgSize
  /** Custom scale percent 1..300 (size=custom). */
  scale: number
  /** Horizontal background position 0..100 (%), freely adjustable. */
  posX: number
  /** Vertical background position 0..100 (%), freely adjustable. */
  posY: number
  /** Legacy free-form position kept for compatibility (e.g. 'left center'). */
  position: string
  /** Gaussian blur in px 0..60 (rendered as filter). */
  blur: number
  /** Opacity percent 0..100. */
  opacity: number
  /** Edge feather in px 0..200 (mask gradient inset). */
  feather: number
  /** Whether the layer renders. */
  visible: boolean
}

export interface BackgroundConfig {
  /** Master switch for the whole layer stack. */
  enabled: boolean
  /** Global darkening overlay 0..0.9. */
  overlay: number
  /** Layer stack, first = topmost. */
  layers: BackgroundLayer[]
}

/** The full user scheme, persisted under one localStorage key. */
export interface Scheme {
  version: 1
  background: BackgroundConfig
  /** Token overrides keyed by CSS variable name. */
  tokens: Record<string, TokenPair>
  /** Raw user CSS, injected at the end of head. */
  css: string
  /** Element-picker generated rules, applied after user css. */
  rules: PickerRule[]
}

export const STORE_KEY = 'dsh.skin-studio.v1'

export function createLayer(kind: 'image' | 'color' = 'image'): BackgroundLayer {
  return {
    id: `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    image: '',
    color: '#6366f1',
    size: 'cover',
    scale: 100,
    posX: 50,
    posY: 50,
    position: 'center',
    blur: 0,
    opacity: 100,
    feather: 0,
    visible: true,
  }
}

/** Parse a legacy CSS position string into posX/posY percentages. */
export function positionToXY(position: string): { posX: number; posY: number } {
  const pct = /(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/.exec(position)
  if (pct !== null) {
    return { posX: Math.max(0, Math.min(100, parseFloat(pct[1]))), posY: Math.max(0, Math.min(100, parseFloat(pct[2]))) }
  }
  const posX = position.includes('left') ? 0 : position.includes('right') ? 100 : 50
  const posY = position.includes('top') ? 0 : position.includes('bottom') ? 100 : 50
  return { posX, posY }
}

export const DEFAULT_SCHEME: Scheme = {
  version: 1,
  background: {
    enabled: false,
    overlay: 0.2,
    layers: [],
  },
  tokens: {},
  css: '',
  rules: [],
}
