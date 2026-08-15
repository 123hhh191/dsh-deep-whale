/** Shared localStorage-backed scheme store with a tiny subscribe surface. */

import { createLayer, DEFAULT_SCHEME, positionToXY, STORE_KEY, type BackgroundLayer, type Scheme } from './types.ts'

let scheme: Scheme = load()

function load(): Scheme {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw === null) return structuredClone(DEFAULT_SCHEME)
    const parsed = JSON.parse(raw) as Partial<Scheme>
    return normalize(parsed)
  } catch {
    return structuredClone(DEFAULT_SCHEME)
  }
}

function normalize(parsed: Partial<Scheme>): Scheme {
  const base = structuredClone(DEFAULT_SCHEME)
  const backgroundRaw = (parsed.background ?? {}) as Record<string, unknown>
  const layers = normalizeLayers(backgroundRaw.layers, backgroundRaw)
  return {
    ...base,
    ...parsed,
    version: 1,
    background: {
      enabled: backgroundRaw.enabled !== false,
      overlay: typeof backgroundRaw.overlay === 'number' ? backgroundRaw.overlay : base.background.overlay,
      layers,
    },
    tokens: { ...(parsed.tokens ?? {}) },
    rules: Array.isArray(parsed.rules)
      ? parsed.rules.map((rule) => ({
          ...rule,
          extra: Array.isArray(rule.extra)
            ? rule.extra
            : rule.extra != null
              ? [rule.extra]
              : undefined,
        }))
      : [],
    css: typeof parsed.css === 'string' ? parsed.css : '',
  }
}

/** Migrate the pre-layer single-background shape into a one-layer stack. */
function normalizeLayers(
  raw: unknown,
  legacy: Record<string, unknown>,
): BackgroundLayer[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => {
        const layer = createLayer(item.kind === 'color' ? 'color' : 'image')
        const merged = {
          ...layer,
          ...item,
          id: typeof item.id === 'string' ? item.id : layer.id,
        } as BackgroundLayer
        // migrate legacy free-form position strings to numeric posX/posY
        if (typeof merged.posX !== 'number' || typeof merged.posY !== 'number') {
          const xy = positionToXY(merged.position || 'center')
          merged.posX = xy.posX
          merged.posY = xy.posY
        }
        return merged
      })
  }
  const legacyImage = typeof legacy.image === 'string' ? legacy.image : ''
  if (legacyImage === '') return []
  const layer = createLayer('image')
  layer.image = legacyImage
  if (typeof legacy.blur === 'number' && legacy.blur > 0) layer.blur = legacy.blur
  return [layer]
}

function save(): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(scheme))
  } catch {
    // Quota exceeded (oversized image): keep in-memory state, surface later.
    console.warn('[skin-studio] failed to persist scheme (storage quota?)')
  }
}

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export interface SchemeStore {
  get(): Scheme
  /** Merge a partial patch (or a function producing one) and persist. */
  update(patch: Partial<Scheme> | ((current: Scheme) => Partial<Scheme>)): void
  /** Replace the whole scheme (import). */
  replace(next: Scheme): void
  /** Restore the default scheme. */
  reset(): void
  subscribe(listener: () => void): () => void
}

export const store: SchemeStore = {
  get() {
    return scheme
  },
  update(patch) {
    const applied = typeof patch === 'function' ? patch(scheme) : patch
    scheme = normalize({ ...scheme, ...applied })
    save()
    notify()
  },
  replace(next) {
    scheme = normalize(next)
    save()
    notify()
  },
  reset() {
    scheme = structuredClone(DEFAULT_SCHEME)
    save()
    notify()
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
