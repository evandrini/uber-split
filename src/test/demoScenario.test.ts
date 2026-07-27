import { describe, expect, it } from 'vitest'
import type { Language } from '@/i18n/translations'
import { getDemoScenario } from '@/utils/demoScenario'

const expectations = {
  'pt-BR': { payer: 'Rodrigo', friends: ['Vinícius', 'Felipe', 'Patrícia'], destination: 'Bar', total: 'R$ 80,00', equal: 'R$ 20,00' },
  'en-US': { payer: 'Michael', friends: ['Jake', 'Emily', 'Sophia'], destination: 'Restaurant', total: '$80.00', equal: '$20.00' },
  'es-ES': { payer: 'Alejandro', friends: ['Daniel', 'Lucía', 'Sofía'], destination: 'Restaurante', total: '80,00 €', equal: '20,00 €' },
  'zh-CN': { payer: '李明', friends: ['王伟', '张敏', '刘洋'], destination: '餐厅', total: '¥80.00', equal: '¥20.00' },
} satisfies Record<Language, {
  payer: string
  friends: string[]
  destination: string
  total: string
  equal: string
}>

describe('localized landing demonstration', () => {
  it.each(Object.entries(expectations) as Array<[Language, (typeof expectations)[Language]]>)(
    'localizes names, destination and currency for %s',
    (language, expected) => {
      const scenario = getDemoScenario(language)
      expect(scenario.payerName).toBe(expected.payer)
      expect(scenario.passengerNames).toEqual(expected.friends)
      expect(scenario.destinationLabel).toBe(expected.destination)
      expect(scenario.formatCurrency(80)).toBe(expected.total)
      expect(scenario.formatCurrency(20)).toBe(expected.equal)
    },
  )

  it('keeps the educational values exact and independent of the calculator', () => {
    const scenario = getDemoScenario('pt-BR')
    expect(scenario.totalFare).toBe(80)
    expect(scenario.equalShare).toBe(20)
    expect(scenario.proportionalShares).toEqual([40.5, 20.5, 12.5, 6.5])
    expect(scenario.proportionalShares.reduce((sum, value) => sum + value, 0)).toBe(80)
  })

  it('uses only fictional character and destination labels as route stops', () => {
    for (const language of Object.keys(expectations) as Language[]) {
      const scenario = getDemoScenario(language)
      expect(scenario.routeStops).toEqual([
        scenario.payerName,
        ...scenario.passengerNames,
        scenario.destinationLabel,
      ])
      expect(scenario.routeStops.join(' ')).not.toMatch(/rua|street|avenida|road|latitude|longitude/i)
    }
  })
})
