import { describe, expect, it } from 'vitest'
import type { Settlement } from '@/types/ride'
import { buildSharedRideMessage } from '@/utils/shareMessage'

const url = 'https://evandrini.github.io/uber-split/?ride=compact'
const settlements: Settlement[] = [
  {
    fromId: 'evandro',
    fromName: 'Evandro',
    toId: 'bruno',
    toName: 'Bruno',
    amount: 21.64,
  },
]

describe('shared ride message', () => {
  it('formats the Portuguese message with the URL on the last line', () => {
    expect(buildSharedRideMessage(settlements, 'pt-BR', url)).toBe(
      [
        'UberSplit',
        '',
        'Evandro deve pagar R$ 21,64 para Bruno.',
        '',
        'Confira os detalhes da divisão:',
        url,
      ].join('\n'),
    )
  })

  it('formats the English message and lists multiple transfers separately', () => {
    const extraSettlement: Settlement = {
      fromId: 'ana',
      fromName: 'Ana',
      toId: 'bruno',
      toName: 'Bruno',
      amount: 10,
    }
    const message = buildSharedRideMessage(
      [...settlements, extraSettlement],
      'en-US',
      url,
    )

    expect(message.split('\n')).toEqual([
      'UberSplit',
      '',
      'Evandro should pay $21.64 to Bruno.',
      'Ana should pay $10.00 to Bruno.',
      '',
      'View the full breakdown:',
      url,
    ])
  })
})
