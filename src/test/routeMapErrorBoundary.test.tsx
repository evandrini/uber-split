// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouteMapErrorBoundary } from '@/components/RouteMapErrorBoundary'
import type { RideCalculation } from '@/types/ride'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const trip = {
  legs: [
    {
      fromStop: { id: 'a', name: 'Origem', entering: [], exiting: [] },
      toStop: { id: 'b', name: 'Destino', entering: [], exiting: [] },
    },
  ],
} as RideCalculation

function BrokenMap() {
  throw new Error('map failed')
}

describe('RouteMapErrorBoundary', () => {
  it('keeps a compact route fallback visible when the map fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <RouteMapErrorBoundary language="pt-BR" trip={trip}>
        <BrokenMap />
      </RouteMapErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o mapa. Os valores da conta continuam disponíveis abaixo.',
    )
    expect(screen.getByText('Origem')).toBeInTheDocument()
    expect(screen.getByText('Destino')).toBeInTheDocument()
  })

  it('shows the English message for the English app language', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <RouteMapErrorBoundary language="en-US" trip={trip}>
        <BrokenMap />
      </RouteMapErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The map could not be loaded. The calculation results are still available below.',
    )
  })
})
