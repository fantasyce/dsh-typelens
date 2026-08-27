import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { TypeLensSettings } from './TypeLensSettings.js'
import { en, zh, type TypeLensLocaleKey } from './locales.js'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    typelens: TypeLensLocaleKey
  }
}

export { TypeLensSettings } from './TypeLensSettings.js'

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register('typelens', { en, zh }), 'typelens: client dictionaries')
  const t = ctx.locale.bind('typelens')
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'typelens', order: 18, label: () => t('nav'), locale: 'typelens',
  }, TypeLensSettings))
}
