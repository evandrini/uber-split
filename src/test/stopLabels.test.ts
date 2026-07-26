import { describe, expect, it } from 'vitest'
import { getShortStopAddress, getStopLabel } from '@/utils/stopLabels'

describe('stop labels', () => {
  it('uses spreadsheet-style letters beyond Z', () => {
    expect([0, 1, 25, 26, 27, 51].map(getStopLabel)).toEqual([
      'A',
      'B',
      'Z',
      'AA',
      'AB',
      'AZ',
    ])
  })

  it('removes redundant locality parts from the compact address', () => {
    expect(getShortStopAddress({
      address: 'Rua Vertentes, 84, Belo Horizonte, Minas Gerais, Brasil',
      name: '',
      city: 'Belo Horizonte',
      state: 'Minas Gerais',
      country: 'Brasil',
    })).toBe('Rua Vertentes, 84')
  })
})
