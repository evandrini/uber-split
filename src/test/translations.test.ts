import { describe, expect, it } from 'vitest'
import { translations } from '@/i18n/translations'

describe('translations', () => {
  it('provides all sharing and navigation labels in four languages', () => {
    const keys = [
      'copyMessage',
      'shareWhatsApp',
      'creatingShareLink',
      'openingWhatsApp',
      'messageCopied',
      'shortLinkUnavailable',
      'copyLongLink',
      'madeBy',
      'goHome',
    ] as const

    for (const language of ['pt-BR', 'en-US', 'es-ES', 'zh-CN'] as const) {
      for (const key of keys) {
        expect(translations[language][key]).toBeTruthy()
      }
    }
  })
})
