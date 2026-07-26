// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { translations } from '@/i18n/translations'
import { calculateCosts, calculateLegs, combineCalculations } from '@/utils/rideCalculator'
import type { Participant, Stop } from '@/types/ride'

vi.mock('@/components/RouteSummaryMap', () => ({
  RouteSummaryMap: () => (
    <div data-testid="route-map">
      map
      <div data-testid="distance-chart">Distância percorrida por pessoa</div>
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

afterEach(cleanup)

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
    expect(screen.getByText('Distância percorrida por pessoa')).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: /ver detalhes do cálculo/i }))
    expect(screen.getByTestId('calculation-details')).toBeInTheDocument()
    const details = screen.getByTestId('calculation-details')
    fireEvent.click(screen.getByRole('button', { name: /ver menos/i }))
    await waitForElementToBeRemoved(details)
  })

  it('keeps the final total and participant costs evident', () => {
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
    expect(screen.getByText(/R\$\s*20,00/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*10,00/)).toBeInTheDocument()
  })

  it('keeps the copy-link action compact and secondary', () => {
    render(
      <ResultStep
        fullCalculation={fullCalculation}
        participants={participants}
        settlements={[]}
        onBack={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    const button = screen.getByRole('button', { name: /copiar link do resultado/i })
    expect(button).toHaveClass('h-10', 'text-sm', 'sm:w-auto')
    expect(button).not.toHaveClass('gradient-primary')
  })
})
