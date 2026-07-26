// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { translations } from '@/i18n/translations'
import { calculateCosts, calculateLegs, combineCalculations } from '@/utils/rideCalculator'
import type { Participant, Stop } from '@/types/ride'

vi.mock('@/components/RouteSummaryMap', () => ({
  RouteSummaryMap: () => <div data-testid="route-map">map</div>,
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

  it('builds the distance chart from leg distances rather than ride cost', () => {
    render(
      <ResultStep
        fullCalculation={fullCalculation}
        participants={participants}
        settlements={[]}
        onBack={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    const chart = within(screen.getByTestId('distance-chart'))
    expect(chart.getByText('15.0 km')).toBeInTheDocument()
    expect(chart.getByText('10.0 km')).toBeInTheDocument()
  })
})
