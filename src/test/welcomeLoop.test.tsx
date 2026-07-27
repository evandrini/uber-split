// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { translations } from '@/i18n/translations'

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'pt-BR',
    t: (key: keyof typeof translations['pt-BR']) => translations['pt-BR'][key],
  }),
}))

vi.mock('framer-motion', async importOriginal => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: () => false }
})

import { WelcomeScreen } from '@/components/WelcomeScreen'

describe('welcome animation loop', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('advances through passenger pickups and restarts smoothly', () => {
    vi.useFakeTimers()
    render(<WelcomeScreen onStart={vi.fn()} />)
    expect(screen.getByTestId('demo-status')).toHaveTextContent('Rodrigo iniciou a corrida')

    act(() => vi.advanceTimersByTime(1600))
    expect(screen.getByTestId('demo-status')).toHaveTextContent('Vinícius entrou')

    for (const delay of [1600, 1600, 1600, 1900, 1900, 1900, 3200]) {
      act(() => vi.advanceTimersByTime(delay))
    }
    expect(screen.getByTestId('demo-status')).toHaveTextContent('Rodrigo iniciou a corrida')
  })
})
