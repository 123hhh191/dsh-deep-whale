/** Settings row: the skin studio surface inside the General section. */

import { useRef, useState, useSyncExternalStore } from 'react'
import { store } from './store.ts'
import { compressImage, readTextFile } from './image.ts'
import { getPicker, getToolbarVisible } from './picker.ts'
import { TOKEN_DIRECTORY, TOKEN_GROUPS, fromHex, toHex } from './tokens.ts'
import { createLayer, positionToXY, type BgSize, type Scheme, type TokenPair } from './types.ts'
import styles from './studio.module.css'

/** Read a live CSS variable value (built-in defaults or current overrides). */
function liveTokenValue(variable: string): string {
  return getComputedStyle(document.body).getPropertyValue(variable).trim()
}

function tokenColorInput(
  variable: string,
  mode: 'light' | 'dark',
  pair: TokenPair | undefined,
  onChange: (hex: string) => void,
): JSX.Element {
  const live = pair?.[mode] ?? liveTokenValue(variable)
  const hex = toHex(live) ?? '#000000'
  return (
    <label className={styles.colorCell} title={`${mode}: ${live}`}>
      <input
        type='color'
        value={hex}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className={styles.colorCode}>{hex}</span>
    </label>
  )
}

function BackgroundSection({ scheme }: { scheme: Scheme }): JSX.Element {
  const imageRef = useRef<HTMLInputElement>(null)
  const { background } = scheme

  const updateBackground = (patch: Partial<Scheme['background']>): void => {
    store.update((current) => ({ background: { ...current.background, ...patch } }))
  }

  const updateLayer = (id: string, patch: Partial<Scheme['background']['layers'][number]>): void => {
    store.update((current) => ({
      background: {
        ...current.background,
        layers: current.background.layers.map((layer) => (
          layer.id === id ? { ...layer, ...patch } : layer
        )),
      },
    }))
  }

  const addImageLayer = async (file: File | undefined): Promise<void> => {
    if (file === undefined) return
    try {
      const image = await compressImage(file)
      store.update((current) => ({
        background: {
          ...current.background,
          enabled: true,
          layers: [{ ...createLayer('image'), image }, ...current.background.layers],
        },
      }))
    } catch (error) {
      alert(`图片处理失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const addColorLayer = (): void => {
    store.update((current) => ({
      background: {
        ...current.background,
        enabled: true,
        layers: [createLayer('color'), ...current.background.layers],
      },
    }))
  }

  const removeLayer = (id: string): void => {
    store.update((current) => ({
      background: {
        ...current.background,
        layers: current.background.layers.filter((layer) => layer.id !== id),
      },
    }))
  }

  const moveLayer = (index: number, delta: number): void => {
    store.update((current) => {
      const layers = [...current.background.layers]
      const target = index + delta
      if (target < 0 || target >= layers.length) return {}
      const [item] = layers.splice(index, 1)
      layers.splice(target, 0, item)
      return { background: { ...current.background, layers } }
    })
  }

  /** Recreate the old dist-injected wallpaper look as a three-layer stack. */
  const applyWallpaperPreset = (): void => {
    store.update((current) => {
      const first = current.background.layers[0]
      if (first === undefined || first.kind !== 'image' || first.image === '') return {}
      const fill = { ...createLayer('image'), image: first.image, size: 'cover' as const }
      const band = {
        ...createLayer('image'),
        image: first.image,
        size: 'cover' as const,
        blur: 22,
        feather: 260,
        opacity: 100,
      }
      const image = {
        ...createLayer('image'),
        image: first.image,
        size: 'contain' as const,
        feather: 150,
        opacity: 100,
      }
      return { background: { ...current.background, enabled: true, layers: [image, band, fill] } }
    })
  }

  return (
    <div className={styles.block}>
      <div className={styles.blockTitle}>
        背景图层 <span className={styles.muted}>（顶层在最上，支持模糊/透明/羽化）</span>
      </div>
      <label className={styles.row}>
        <input
          type='checkbox'
          checked={background.enabled}
          onChange={(event) => updateBackground({ enabled: event.target.checked })}
        />
        <span>启用背景（表面自动半透明，图层透出）</span>
      </label>

      {background.layers.map((layer, index) => (
        <div key={layer.id} className={styles.layerCard}>
          <div className={styles.layerHead}>
            {layer.kind === 'image' && layer.image !== '' ? (
              <img className={styles.layerThumb} src={layer.image} alt='' />
            ) : (
              <span
                className={styles.layerThumb}
                style={{ background: layer.kind === 'color' ? layer.color : '#888' }}
              />
            )}
            <span className={styles.layerTitle}>
              {layer.kind === 'image' ? `图片图层 ${index + 1}` : `颜色图层 ${index + 1}`}
            </span>
            <input
              type='checkbox'
              title='显示/隐藏'
              checked={layer.visible}
              onChange={(event) => updateLayer(layer.id, { visible: event.target.checked })}
            />
            <button type='button' className={styles.buttonGhost} title='上移'
              disabled={index === 0} onClick={() => moveLayer(index, -1)}>↑</button>
            <button type='button' className={styles.buttonGhost} title='下移'
              disabled={index === background.layers.length - 1} onClick={() => moveLayer(index, 1)}>↓</button>
            <button type='button' className={styles.buttonGhost} title='删除'
              onClick={() => removeLayer(layer.id)}>✕</button>
          </div>

          {layer.kind === 'image' && (
            <label className={styles.sliderRow}>
              <span>尺寸</span>
              <select
                className={styles.select}
                value={layer.size}
                onChange={(event) => updateLayer(layer.id, { size: event.target.value as BgSize })}
              >
                <option value='cover'>铺满（裁剪）</option>
                <option value='contain'>完整显示（留边）</option>
                <option value='stretch'>拉伸</option>
                <option value='custom'>自定义缩放</option>
                <option value='repeat'>平铺</option>
              </select>
            </label>
          )}

          {layer.kind === 'image' && layer.size === 'custom' && (
            <label className={styles.sliderRow}>
              <span>缩放：{layer.scale}%</span>
              <input
                type='range'
                min={10}
                max={300}
                value={layer.scale}
                onChange={(event) => updateLayer(layer.id, { scale: Number(event.target.value) })}
              />
            </label>
          )}

          {/* Position controls are meaningless for stretch (image pinned to
              100%x100%); keep them for the modes where they translate. */}
          {layer.kind === 'image' && layer.size !== 'stretch' && (
            <>
              <label className={styles.sliderRow}>
                <span>位置预设</span>
                <select
                  className={styles.select}
                  value={layer.position}
                  onChange={(event) => {
                    const position = event.target.value
                    const { posX, posY } = positionToXY(position)
                    updateLayer(layer.id, { position, posX, posY })
                  }}
                >
                  <option value='center'>居中</option>
                  <option value='left center'>靠左</option>
                  <option value='right center'>靠右</option>
                  <option value='center top'>靠上</option>
                  <option value='center bottom'>靠下</option>
                </select>
              </label>
              <label className={styles.sliderRow}>
                <span>左右移动：{layer.posX}%</span>
                <input
                  type='range'
                  min={0}
                  max={100}
                  value={layer.posX}
                  onChange={(event) => {
                    const posX = Number(event.target.value)
                    updateLayer(layer.id, { posX, position: `${posX}% ${layer.posY}%` })
                  }}
                />
              </label>
              <label className={styles.sliderRow}>
                <span>上下移动：{layer.posY}%</span>
                <input
                  type='range'
                  min={0}
                  max={100}
                  value={layer.posY}
                  onChange={(event) => {
                    const posY = Number(event.target.value)
                    updateLayer(layer.id, { posY, position: `${layer.posX}% ${posY}%` })
                  }}
                />
              </label>
            </>
          )}

          {layer.kind === 'color' && (
            <label className={styles.row}>
              <span>颜色</span>
              <input
                type='color'
                value={toHex(layer.color) ?? '#000000'}
                onChange={(event) => {
                  const rgb = fromHex(event.target.value)
                  if (rgb !== null) updateLayer(layer.id, { color: rgb })
                }}
              />
            </label>
          )}

          <label className={styles.sliderRow}>
            <span>模糊：{layer.blur}px</span>
            <input
              type='range'
              min={0}
              max={60}
              value={layer.blur}
              onChange={(event) => updateLayer(layer.id, { blur: Number(event.target.value) })}
            />
          </label>

          <label className={styles.sliderRow}>
            <span>透明度：{layer.opacity}%</span>
            <input
              type='range'
              min={0}
              max={100}
              value={layer.opacity}
              onChange={(event) => updateLayer(layer.id, { opacity: Number(event.target.value) })}
            />
          </label>

          <label className={styles.sliderRow}>
            <span>边缘羽化：{layer.feather}px</span>
            <input
              type='range'
              min={0}
              max={200}
              value={layer.feather}
              onChange={(event) => updateLayer(layer.id, { feather: Number(event.target.value) })}
            />
          </label>
        </div>
      ))}

      <div className={styles.row}>
        <button type='button' className={styles.button} onClick={() => imageRef.current?.click()}>
          ＋ 添加图片层
        </button>
        <input
          ref={imageRef}
          type='file'
          accept='image/*'
          style={{ display: 'none' }}
          onChange={(event) => {
            void addImageLayer(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <button type='button' className={styles.button} onClick={addColorLayer}>
          ＋ 添加颜色层
        </button>
        <button
          type='button'
          className={styles.button}
          title='复刻旧版壁纸效果：清晰完整图 + 模糊带 + 铺满底层'
          onClick={applyWallpaperPreset}
        >
          壁纸三层预设
        </button>
      </div>

      <label className={styles.sliderRow}>
        <span>全局压暗：{Math.round(background.overlay * 100)}%</span>
        <input
          type='range'
          min={0}
          max={90}
          value={Math.round(background.overlay * 100)}
          onChange={(event) => updateBackground({ overlay: Number(event.target.value) / 100 })}
        />
      </label>
    </div>
  )
}

function TokenSection({ scheme }: { scheme: Scheme }): JSX.Element {
  const grouped = TOKEN_GROUPS
  const entries = TOKEN_DIRECTORY

  return (
    <div className={styles.block}>
      <div className={styles.blockTitle}>
        主题 Token <span className={styles.muted}>（亮/暗两套，实时生效）</span>
      </div>
      {Object.entries(grouped).map(([group, label]) => {
        const items = entries.filter((entry) => entry.group === group)
        if (items.length === 0) return null
        return (
          <details key={group} className={styles.group}>
            <summary>
              {label}
              <span className={styles.muted}>
                {' '}
                {items.filter((entry) => scheme.tokens[entry.variable]).length
                  ? `· ${items.filter((entry) => scheme.tokens[entry.variable]).length} 已改`
                  : ''}
              </span>
            </summary>
            {items.map((entry) => {
              const pair = scheme.tokens[entry.variable]
              const setColor = (mode: 'light' | 'dark') => (hex: string): void => {
                const next = fromHex(hex)
                if (next === null) return
                const base = pair ?? {
                  light: liveTokenValue(entry.variable),
                  dark: liveTokenValue(entry.variable),
                }
                store.update((current) => ({
                  tokens: {
                    ...current.tokens,
                    [entry.variable]: { ...base, [mode]: next },
                  },
                }))
              }
              return (
                <div key={entry.variable} className={styles.tokenRow}>
                  <div className={styles.tokenInfo}>
                    <span className={styles.tokenLabel}>{entry.label}</span>
                    <code className={styles.tokenVar}>{entry.variable}</code>
                  </div>
                  <div className={styles.colorCells}>
                    {tokenColorInput(entry.variable, 'light', pair, setColor('light'))}
                    {tokenColorInput(entry.variable, 'dark', pair, setColor('dark'))}
                  </div>
                  {pair !== undefined && (
                    <button
                      type='button'
                      className={styles.buttonGhost}
                      onClick={() => store.update((current) => {
                        const tokens = { ...current.tokens }
                        delete tokens[entry.variable]
                        return { tokens }
                      })}
                    >
                      重置
                    </button>
                  )}
                </div>
              )
            })}
          </details>
        )
      })}
    </div>
  )
}

function CssSection({ scheme }: { scheme: Scheme }): JSX.Element {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <div className={styles.block}>
      <div className={styles.blockTitle}>
        原始 CSS <span className={styles.muted}>（注入到页面末尾，优先级最高）</span>
      </div>
      <textarea
        className={styles.cssEditor}
        spellCheck={false}
        value={scheme.css}
        placeholder={'/* 例：改对话区导航栏 */\n[data-pane="conversation"] header {\n  background: rgba(0, 0, 0, 0.4) !important;\n  backdrop-filter: blur(12px);\n}'}
        onChange={(event) => {
          const next = event.target.value
          if (timer.current !== null) clearTimeout(timer.current)
          timer.current = setTimeout(() => {
            store.update({ css: next })
          }, 400)
        }}
      />
      <div className={styles.muted}>
        可用稳定钩子：<code>[data-pane="sidebar"]</code>、<code>[data-pane="conversation"]</code>、{' '}
        <code>[data-composer-seat]</code>、<code>[data-chat-flow]</code>、{' '}
        <code>[data-composer-card]</code>；暗色模式用{' '}
        <code>body[data-ds-dark-theme]</code> 前缀。
      </div>
    </div>
  )
}

function SchemeSection(): JSX.Element {
  const importRef = useRef<HTMLInputElement>(null)

  const exportScheme = (): void => {
    const blob = new Blob([JSON.stringify(store.get(), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dsh-skin-studio-scheme.json'
    anchor.click()
    // Revoking immediately can cancel the in-flight download.
    window.setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const importScheme = async (file: File | undefined): Promise<void> => {
    if (file === undefined) return
    try {
      const parsed = JSON.parse(await readTextFile(file)) as Partial<Scheme>
      if (typeof parsed !== 'object' || parsed === null) throw new Error('不是有效的方案文件')
      store.replace(parsed as Scheme)
      alert('方案已导入')
    } catch (error) {
      alert(`导入失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className={styles.block}>
      <div className={styles.blockTitle}>方案</div>
      <div className={styles.row}>
        <button type='button' className={styles.button} onClick={exportScheme}>
          导出方案
        </button>
        <button
          type='button'
          className={styles.button}
          onClick={() => importRef.current?.click()}
        >
          导入方案
        </button>
        <input
          ref={importRef}
          type='file'
          accept='application/json,.json'
          style={{ display: 'none' }}
          onChange={(event) => {
            void importScheme(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>
      <div className={styles.row}>
        <button
          type='button'
          className={styles.buttonDanger}
          onClick={() => {
            if (window.confirm('恢复默认会清空全部自定义，确定？')) store.reset()
          }}
        >
          恢复默认
        </button>
      </div>
    </div>
  )
}

export function SkinStudioRow(): JSX.Element {
  const scheme = useSyncExternalStore(store.subscribe, store.get)
  const [toolbarVisible, setToolbarVisibleState] = useState(getToolbarVisible)
  const setToolbarVisible = (visible: boolean): void => {
    getPicker().setVisible(visible)
    setToolbarVisibleState(visible)
  }

  return (
    <div className={styles.root}>
      <div className={styles.title}>主题定制</div>

      <BackgroundSection scheme={scheme} />
      <TokenSection scheme={scheme} />
      <CssSection scheme={scheme} />

      <div className={styles.block}>
        <div className={styles.blockTitle}>
          元素拾取器 <span className={styles.muted}>（点哪个改哪个）</span>
        </div>
        <label className={styles.row}>
          <input
            type='checkbox'
            checked={toolbarVisible}
            onChange={(event) => {
              setToolbarVisible(event.target.checked)
            }}
          />
          <span>显示拾取/涂色工具栏（可拖动，位置自动记忆）</span>
        </label>
        <div className={styles.row}>
          <button
            type='button'
            className={styles.buttonPrimary}
            onClick={() => getPicker().toggle()}
          >
            🎨 拾取元素
          </button>
        </div>
      </div>

      <SchemeSection />
    </div>
  )
}
