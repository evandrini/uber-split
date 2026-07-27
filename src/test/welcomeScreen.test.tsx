// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { translations } from '@/i18n/translations'
import type { Language } from '@/i18n/translations'

let currentLanguage: Language = 'pt-BR'

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    language: currentLanguage,
    t: (key: keyof typeof translations['pt-BR']) => translations[currentLanguage][key],
  }),
}))

vi.mock('framer-motion', async importOriginal => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: () => true }
})

import { WelcomeScreen } from '@/components/WelcomeScreen'

describe('welcome demonstration', () => {
  afterEach(() => {
    cleanup()
    currentLanguage = 'pt-BR'
  })

  it('shows the complete proportional comparison without continuous movement in reduced motion', () => {
    render(<WelcomeScreen onStart={vi.fn()} />)
    expect(screen.getByText('Divisão proporcional')).toBeInTheDocument()
    expect(screen.getByText(/Patrícia paga para Rodrigo/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*6,50/)).toBeInTheDocument()
  })

  it('updates every scenario label when the language changes', () => {
    const { rerender } = render(<WelcomeScreen onStart={vi.fn()} />)
    expect(screen.getAllByText('Rodrigo').length).toBeGreaterThan(0)

    currentLanguage = 'zh-CN'
    rerender(<WelcomeScreen onStart={vi.fn()} />)
    expect(screen.queryByText('Rodrigo')).not.toBeInTheDocument()
    expect(screen.getAllByText('李明').length).toBeGreaterThan(0)
    expect(screen.getByText('餐厅')).toBeInTheDocument()
    expect(screen.getByText(/¥\s*6\.50/)).toBeInTheDocument()
  })

  it('lets returning users start immediately', () => {
    const onStart = vi.fn()
    render(<WelcomeScreen onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))
    expect(onStart).toHaveBeenCalledOnce()
  })

  it('keeps responsive and theme-aware layout classes', () => {
    const { container } = render(<WelcomeScreen onStart={vi.fn()} />)
    const section = screen.getByTestId('welcome-screen')
    expect(section).toHaveClass('w-full', 'min-w-0', 'max-w-full', 'overflow-hidden', 'px-5', 'sm:px-9', 'bg-card/65')
    expect(container.querySelector('.lg\\:grid-cols-\\[minmax\\(0\\,0\\.88fr\\)_minmax\\(0\\,1\\.12fr\\)\\]')).toBeInTheDocument()
    expect(container.querySelector('.h-48.sm\\:h-52')).toBeInTheDocument()
    expect(screen.getByTestId('demo-card')).toHaveClass('w-full', 'min-w-0', 'max-w-full', 'overflow-hidden')
    expect(screen.getByTestId('demo-status-area')).toHaveClass('h-6', 'w-full', 'min-w-0', 'overflow-hidden')
    expect(screen.getByTestId('demo-status')).toHaveClass('min-w-0', 'flex-1', 'truncate')
    expect(screen.getByTestId('demo-comparison')).toHaveClass('h-[126px]', 'min-w-0', 'overflow-hidden')

    document.documentElement.classList.add('dark')
    expect(container.querySelector('.dark\\:border-white\\/10')).toBeInTheDocument()
    document.documentElement.classList.remove('dark')
  })
})
