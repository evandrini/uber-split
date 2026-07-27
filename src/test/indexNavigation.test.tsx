// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { translations } from '@/i18n/translations'

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'pt-BR',
    setLanguage: vi.fn(),
    t: (key: keyof typeof translations['pt-BR']) => translations['pt-BR'][key],
  }),
}))

vi.mock('@/components/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}))

import Index from '@/pages/Index'

describe('main navigation', () => {
  afterEach(cleanup)
  beforeEach(() => {
    window.history.replaceState({}, '', '/uber-split/')
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  it('returns to a clean home when the UberSplit brand is clicked', () => {
    render(<Index />)
    window.history.replaceState({}, '', '/uber-split/?s=TNaj3Ta1&ride=legacy')
    fireEvent.click(screen.getByRole('link', { name: /voltar para a página inicial/i }))

    expect(window.location.pathname).toBe('/uber-split/')
    expect(window.location.search).toBe('')
    expect(screen.getByText('Participantes')).toBeInTheDocument()
  })

  it('shows the translated Astronex footer link', () => {
    render(<Index />)
    const link = screen.getByRole('link', { name: 'Astronex' })
    expect(link).toHaveAttribute('href', 'https://astronex.com.br')
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByText(/Feito por/)).toBeInTheDocument()
  })
})
