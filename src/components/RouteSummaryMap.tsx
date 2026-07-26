import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { DivIcon, latLngBounds } from 'leaflet'
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Participant, RideCalculation } from '@/types/ride'

const pointName = (index: number) => String.fromCharCode(65 + index)

const joinNames = (ids: string[], participants: Participant[]) =>
  ids
    .map(id => participants.find(participant => participant.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(', ')

const pointIcon = (label: string) =>
  new DivIcon({
    className: '',
    html: `<span class="route-marker">${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

function FitRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length === 0) return
    if (positions.length === 1) {
      map.setView(positions[0], 14, { animate: false })
      return
    }
    map.fitBounds(latLngBounds(positions), { padding: [24, 24], animate: false })
  }, [map, positions])

  return null
}

export function RouteSummaryMap({
  trip,
  participants,
  tripKey,
  fallbackLabel,
  originLabel,
  intermediateLabel,
  destinationLabel,
  enteredLabel,
  exitedLabel,
}: {
  trip: RideCalculation
  participants: Participant[]
  tripKey: string
  fallbackLabel: string
  originLabel: string
  intermediateLabel: string
  destinationLabel: string
  enteredLabel: string
  exitedLabel: string
}) {
  const shouldReduceMotion = useReducedMotion()
  const stops =
    trip.legs.length > 0
      ? [trip.legs[0].fromStop, ...trip.legs.map(leg => leg.toStop)]
      : []
  const stopPositions = stops
    .filter(stop => Number.isFinite(stop.lat) && Number.isFinite(stop.lon))
    .map(stop => [stop.lat as number, stop.lon as number] as [number, number])
  const hasGeometry = Boolean(trip.routeGeometry && trip.routeGeometry.length > 1)
  const positions = hasGeometry ? trip.routeGeometry as [number, number][] : stopPositions
  const center = positions[0] ?? [-19.92, -43.94]

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={tripKey}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
        className="glass-panel overflow-hidden rounded-3xl p-3 sm:p-4"
      >
        <div className="h-56 overflow-hidden rounded-2xl border border-white/70">
          <MapContainer
            center={center}
            zoom={13}
            className="h-full w-full"
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            boxZoom={false}
            keyboard={false}
            zoomControl={false}
            attributionControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {positions.length > 1 && (
              <Polyline
                positions={positions}
                pathOptions={{ color: '#0f766e', weight: 5, opacity: 0.9 }}
              />
            )}
            {stops.map((stop, index) =>
              Number.isFinite(stop.lat) && Number.isFinite(stop.lon) ? (
                <Marker
                  key={stop.id}
                  position={[stop.lat as number, stop.lon as number]}
                  icon={pointIcon(pointName(index))}
                  interactive={false}
                />
              ) : null
            )}
            <FitRoute positions={positions} />
          </MapContainer>
        </div>

        {!hasGeometry && (
          <p className="mt-2 text-[11px] text-muted-foreground">{fallbackLabel}</p>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {stops.map((stop, index) => {
            const entering = joinNames(stop.entering, participants)
            const exiting = joinNames(stop.exiting, participants)
            const shortLabel =
              index === 0
                ? originLabel
                : index === stops.length - 1
                  ? destinationLabel
                  : intermediateLabel

            return (
              <div key={stop.id} className="min-w-0 rounded-xl bg-white/60 px-3 py-2">
                <p className="truncate text-xs font-bold">
                  {pointName(index)} · {shortLabel}
                </p>
                {entering && <p className="truncate text-[11px] text-emerald-700">{entering} {enteredLabel}</p>}
                {exiting && <p className="truncate text-[11px] text-rose-700">{exiting} {exitedLabel}</p>}
              </div>
            )
          })}
        </div>
      </motion.section>
    </AnimatePresence>
  )
}
