// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Participant, RideCalculation, Stop } from '@/types/ride'

vi.mock('leaflet', () => ({
  DivIcon: class {},
  latLngBounds: (positions: unknown) => positions,
}))
vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    whenReady,
  }: {
    children: ReactNode
    whenReady?: () => void
  }) => {
    useEffect(() => {
      whenReady?.()
    }, [whenReady])
    return <div data-testid="leaflet-map">{children}</div>
  },
  Marker: () => <div data-testid="leaflet-marker" />,
  Polyline: ({ positions }: { positions: unknown }) => (
    <div data-testid="leaflet-polyline" data-positions={JSON.stringify(positions)} />
  ),
  TileLayer: () => <div data-testid="leaflet-tiles" />,
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn() }),
}))

import { RouteSummaryMap } from '@/components/RouteSummaryMap'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

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
  legBreakdown: [{
    from: 'A',
    to: 'B',
    distance: 10,
    totalLegCost: 20,
    passengerIds: ['p0'],
    passengerNames: ['Bruno'],
    sharedWith: 1,
    costPerPassenger: 20,
  }],
  routeGeometry: [[-19.9, -43.9], [-19.85, -43.85], [-19.8, -43.8]],
  routeGeometryStatus: 'ready',
}

const renderMap = (
  ride: RideCalculation,
  options: {
    autoPlay?: boolean
    onPlaybackComplete?: () => void
  } = {},
) =>
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
      skipLabel="Skip animation"
      accumulatedLabel="Accumulated participation"
      nextLegLabel="Next segment"
      splitOneLabel="Split: 1 person"
      splitManyLabel="Split between {count} people"
      distanceTitle="Distance traveled by person"
      distanceDescription="The bar grows as each passenger travels through the route segments."
      autoPlay={options.autoPlay}
      onPlaybackComplete={options.onPlaybackComplete}
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
    expect(screen.getByTestId('route-animation-status')).toHaveClass(
      'h-[132px]',
      'min-h-[132px]',
    )
    expect(screen.getByTestId('route-animation-controls')).toHaveClass(
      'h-9',
      'min-h-9',
    )
    expect(screen.getByText('A · Origin')).toBeInTheDocument()
    expect(screen.getByText('B · Destination')).toBeInTheDocument()
    expect(screen.getByText('Distance traveled by person')).toBeInTheDocument()
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

  it('autoplays once only after the map and real geometry are ready', () => {
    vi.useFakeTimers()
    const onPlaybackComplete = vi.fn()
    renderMap(trip, { autoPlay: true, onPlaybackComplete })

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    for (let frame = 0; frame < 100; frame += 1) {
      act(() => vi.advanceTimersByTime(100))
    }

    expect(onPlaybackComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Replay' })).toBeInTheDocument()
  })

  it('does not autoplay while route geometry is loading', () => {
    renderMap(
      { ...trip, routeGeometryStatus: 'loading' },
      { autoPlay: true },
    )

    expect(screen.getByRole('button', { name: 'Play route' })).toBeInTheDocument()
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })
})
