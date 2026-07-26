// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Participant, RideCalculation, Stop } from '@/types/ride'

vi.mock('leaflet', () => ({
  DivIcon: class {},
  latLngBounds: (positions: unknown) => positions,
}))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="leaflet-map">{children}</div>,
  Marker: () => <div data-testid="leaflet-marker" />,
  Polyline: ({ positions }: { positions: unknown }) => (
    <div data-testid="leaflet-polyline" data-positions={JSON.stringify(positions)} />
  ),
  TileLayer: () => <div data-testid="leaflet-tiles" />,
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn() }),
}))

import { RouteSummaryMap } from '@/components/RouteSummaryMap'

afterEach(cleanup)

const participants: Participant[] = [{ id: 'p0', name: 'Bruno' }]
const first: Stop = {
  id: 'a', name: 'A', address: 'A', lat: -19.9, lon: -43.9, entering: ['p0'], exiting: [],
}
const last: Stop = {
  id: 'b', name: 'B', address: 'B', lat: -19.8, lon: -43.8, entering: [], exiting: ['p0'],
}
const trip: RideCalculation = {
  totalCost: 20,
  totalDistance: 10,
  participantCosts: [],
  legs: [{ fromStop: first, toStop: last, distance: 10, passengers: ['p0'] }],
  legBreakdown: [],
  routeGeometry: [[-19.9, -43.9], [-19.85, -43.85], [-19.8, -43.8]],
  routeGeometryStatus: 'ready',
}

const renderMap = (ride: RideCalculation) =>
  render(
    <RouteSummaryMap
      trip={ride}
      participants={participants}
      tripKey="outbound"
      fallbackLabel="Fallback"
      loadingLabel="Loading"
      originLabel="Origin"
      intermediateLabel="Stop"
      destinationLabel="Destination"
      enteredLabel="entered"
      exitedLabel="exited"
      language="en-US"
      playLabel="Play route"
      pauseLabel="Pause"
      replayLabel="Replay"
    />,
  )

describe('route summary map', () => {
  it('renders real tiles, stop markers, and the stored route Polyline', () => {
    renderMap(trip)
    expect(screen.getByTestId('leaflet-tiles')).toBeInTheDocument()
    expect(screen.getAllByTestId('leaflet-marker')).toHaveLength(2)
    expect(screen.getByTestId('leaflet-polyline')).toHaveAttribute(
      'data-positions',
      JSON.stringify(trip.routeGeometry),
    )
  })

  it('renders a straight Polyline and explanation when OSRM fallback is used', () => {
    renderMap({
      ...trip,
      routeGeometry: [[-19.9, -43.9], [-19.8, -43.8]],
      routeGeometryStatus: 'fallback',
    })
    expect(screen.getByTestId('leaflet-polyline')).toBeInTheDocument()
    expect(screen.getByText('Fallback')).toBeInTheDocument()
  })
})
