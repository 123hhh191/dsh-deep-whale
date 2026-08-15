/** Skin studio client entry: scheme binding, settings row, element picker. */

import type { Context } from '@deepseek-ai/cordis'
import { bindApply, type ThemeService } from './apply.ts'
import { getPicker } from './picker.ts'
import { SkinStudioRow } from './settings-row.tsx'

/** Services the guard facade exposes to this plugin's apply(). */
export const inject = ['slots', 'theme']

interface StudioContext extends Context {
  slots: {
    inject(name: string, factory: () => unknown): void
    register(options: Record<string, unknown>, Component: unknown): unknown
  }
  theme: ThemeService
}

/**
 * Apply the skin studio: bind the scheme to the theme service, register the
 * General-section settings row, and mount the element picker. Every owned DOM
 * write and the override layer are retracted by the effect disposer.
 * @param ctx - client cordis context with slots and theme services.
 */
export function apply(ctx: StudioContext): void {
  const applyHandle = bindApply(ctx.theme)
  const picker = getPicker()

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'skin-studio',
    order: 20,
  }, SkinStudioRow))

  ctx.effect(() => () => {
    applyHandle.dispose()
    picker.dispose()
  }, 'ui-skin-studio: scheme binding, settings row, and picker')
}
