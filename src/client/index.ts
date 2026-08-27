import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { TypeLensSettings } from './TypeLensSettings.js'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    typelens: 'nav'
  }
}

export { TypeLensSettings } from './TypeLensSettings.js'

export const inject = ['slots', 'locale']

const dictionaries = {
  en: { nav: 'TypeLens' },
  zh: { nav: '类型透镜' },
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register('typelens', dictionaries), 'typelens: client dictionaries')
  const t = ctx.locale.bind('typelens')
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'typelens', order: 18, label: () => t('nav'), locale: 'typelens',
  }, TypeLensSettings))
}
