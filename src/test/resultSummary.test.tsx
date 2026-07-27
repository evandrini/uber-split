// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { translations } from '@/i18n/translations'
import { calculateCosts, calculateLegs, combineCalculations } from '@/utils/rideCalculator'
import type { Participant, Stop } from '@/types/ride'

const storageMock = vi.hoisted(() => ({
  create: vi.fn(),
}))

vi.mock('@/utils/sharedRideStorage', () => ({
  sharedRideStorage: storageMock,
  createShortRideUrl: (baseUrl: string, id: string) => {
    const url = new URL(baseUrl)
    url.searchParams.set('s', id)
    return url.toString()
  },
}))
vi.mock('@/components/RouteSummaryMap', () => ({
  RouteSummaryMap: () => (
    <div data-testid="route-map">
      map
      <div data-testid="distance-chart">DistÃ¢ncia percorrida por pessoa</div>
    </div>
  ),
}))
vi.mock('@/components/DebugPanel', () => ({ DebugPanel: () => null }))
vi.mock('@/i18n/LanguageContext', () => ({
  APP_URL: 'https://evandrini.github.io/uber-split/',
  useLanguage: () => ({
    language: 'pt-BR',
    t: (key: keyof typeof translations['pt-BR']) => translations['pt-BR'][key],
  }),
}))

import { ResultStep } from '@/components/steps/ResultStep'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
const participants: Participant[] = [
  { id: 'bruno', name: 'Bruno' },
  { id: 'evandro', name: 'Evandro' },
]
const stops: Stop[] = [
  { id: 'a', name: 'A', address: 'A', entering: ['bruno'], exiting: [] },
  { id: 'b', name: 'B', address: 'B', entering: ['evandro'], exiting: [] },
  { id: 'c', name: 'C', address: 'C', entering: [], exiting: ['bruno', 'evandro'] },
]
const legs = calculateLegs(stops, participants).map((leg, index) => ({
  ...leg,
  distance: index === 0 ? 5 : 10,
}))
const calculation = calculateCosts(30, legs, participants, 'bruno')
const fullCalculation = combineCalculations(calculation, undefined, participants)

describe('result information hierarchy', () => {
  it('opens with the compact result and technical details collapsed', async () => {
    render(
      <ResultStep
        fullCalculation={fullCalculation}
        participants={participants}
        settlements={[]}
        onBack={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    expect(await screen.findByTestId('route-map')).toBeInTheDocument()
    expect(screen.getByText('DistÃ¢ncia percorrida por pessoa')).toBeInTheDocument()
    expect(screen.queryByTestId('calculation-details')).not.toBeInTheDocument()
  })

  it('expands and collapses calculation details on demand', async () => {
    render(
      <ResultStep
        fullCalculation={fullCalculation}
        participants={participants}
        settlements={[]}
        onBack={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /como o cálculo foi feito/i }))
    expect(screen.getByTestId('calculation-details')).toBeInTheDocument()
    const details = screen.getByTestId('calculation-details')
    fireEvent.click(screen.getByRole('button', { name: /ver menos/i }))
    await waitForElementToBeRemoved(details)
  })

  it('presents the ride as a receipt before the detailed calculation', () => {
    render(
      <ResultStep
        fullCalculation={fullCalculation}
        participants={participants}
        settlements={[]}
        onBack={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    expect(screen.getByText('Total da corrida')).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*30,00/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resumo da corrida' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Timeline da corrida' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Divisão calculada automaticamente' })).toBeInTheDocument()
    expect(screen.getByText('Divisão proporcional ao percurso de cada passageiro.')).toBeInTheDocument()
  })

  it('shows only copy-message and WhatsApp sharing controls', () => {
    render(
      <ResultStep
        fullCalculation={fullCalculation}
        participants={participants}
        settlements={[]}
        onBack={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /copiar mensagem/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /compartilhar no whatsapp/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copiar link do resultado/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^compartilhar resultado$/i })).not.toBeInTheDocument()
  })

  it('copies and shares the same complete short-link message while reusing one ID', async () => {
    storageMock.create.mockResolvedValue('K8mP2xQz')
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    window.history.replaceState({}, '', '/uber-split/?ride=legacy')
    render(
      <ResultStep
        fullCalculation={fullCalculation}
        participants={participants}
        settlements={[]}
        onBack={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    expect(storageMock.create).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /copiar mensagem/i }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toContain('?s=K8mP2xQz')
    expect(window.location.pathname).toBe('/uber-split/')
    expect(window.location.search).toBe('?s=K8mP2xQz')

    fireEvent.click(screen.getByRole('button', { name: /compartilhar no whatsapp/i }))

    await waitFor(() =>
      expect(
        open.mock.calls.some(call => String(call[0]).includes('whatsapp.com')),
      ).toBe(true),
    )
    expect(storageMock.create).toHaveBeenCalledTimes(1)
    const whatsappUrl = String(
      open.mock.calls.find(call => String(call[0]).includes('whatsapp.com'))?.[0],
    )
    const message = decodeURIComponent(whatsappUrl.split('text=')[1])
    expect(message).toContain('?s=K8mP2xQz')
    expect(message).toBe(writeText.mock.calls[0][0])
    expect(message).not.toContain('?ride=')
    expect(storageMock.create).toHaveBeenCalledTimes(1)
  })

  it('shares only the summary when short-link creation fails', async () => {
    storageMock.create.mockRejectedValue(new Error('offline'))
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(
      <ResultStep
        fullCalculation={fullCalculation}
        participants={participants}
        settlements={[]}
        onBack={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /compartilhar no whatsapp/i }))
    await waitFor(() =>
      expect(
        open.mock.calls.some(call => String(call[0]).includes('whatsapp.com')),
      ).toBe(true),
    )

    const whatsappUrl = String(
      open.mock.calls.find(call => String(call[0]).includes('whatsapp.com'))?.[0],
    )
    const message = decodeURIComponent(whatsappUrl.split('text=')[1])
    expect(message).toContain('Resultado calculado com UberSplit.')
    expect(message).not.toContain('http')
    expect(screen.getByRole('button', { name: /copiar link longo/i })).toBeInTheDocument()
  })
})
