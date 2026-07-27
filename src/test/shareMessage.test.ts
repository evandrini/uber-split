import { describe, expect, it } from 'vitest'
import type { Language } from '@/i18n/translations'
import type { Settlement } from '@/types/ride'
import { buildSharedRideMessage } from '@/utils/shareMessage'

const url = 'https://evandrini.github.io/uber-split/?s=TNaj3Ta1'
const settlements: Settlement[] = [
  {
    fromId: 'vinicius',
    fromName: 'Vinicius',
    toId: 'evandro',
    toName: 'Evandro',
    amount: 19.97,
  },
]

describe('shared ride message', () => {
  it.each([
    ['pt-BR', 'Vinicius deve pagar R$ 19,97 para Evandro.', 'Veja como a divisão foi calculada'],
    ['en-US', 'Vinicius should pay Evandro $19.97.', 'See how the fare was split'],
    ['es-ES', 'Vinicius debe pagar 19,97 € a Evandro.', 'Mira cómo se dividió el viaje'],
    ['zh-CN', 'Vinicius 应向 Evandro 支付 ¥19.97。', '查看车费是如何分摊的'],
  ] satisfies Array<[Language, string, string]>)(
    'formats the complete %s message with the short URL',
    (language, transfer, curiosity) => {
      const message = buildSharedRideMessage(settlements, language, url)
      expect(message).toContain('🚗 UberSplit')
      expect(message).toContain(`💸 ${transfer}`)
      expect(message).toContain(`👀 ${curiosity}`)
      expect(message.endsWith(url)).toBe(true)
    },
  )

  it('lists every transfer on its own line', () => {
    const message = buildSharedRideMessage(
      [
        ...settlements,
        { fromId: 'ana', fromName: 'Ana', toId: 'evandro', toName: 'Evandro', amount: 10 },
      ],
      'pt-BR',
      url,
    )

    expect(message).toContain('💸 Vinicius deve pagar')
    expect(message).toContain('\n   Ana deve pagar')
  })

  it('keeps the fallback summary free of long URLs', () => {
    const message = buildSharedRideMessage(settlements, 'pt-BR')
    expect(message).toContain('Resultado calculado com UberSplit.')
    expect(message).not.toContain('http')
    expect(message).not.toContain('?ride=')
  })
})
