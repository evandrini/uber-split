import { useEffect, useMemo, useState } from 'react'
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
import type { Language } from '@/i18n/translations'
import {
  buildNarrativeFrames,
  formatStopEvent,
} from '@/utils/routeNarration'

const pointName = (index: number) => String.fromCharCode(65 + index)

const joinNames = (ids: string[], participants: Participant[]) =>
  ids
    .map(id => participants.find(participant => participant.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(', ')

const pointIcon = (label: string, active = false) =>
  new DivIcon({
    className: '',
    html: `<span class="route-marker${active ? ' route-marker-active' : ''}">${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

const carIcon = () =>
  new DivIcon({
    className: '',
    html: '<span class="route-car" aria-hidden="true">🚗</span>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
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
  loadingLabel,
  originLabel,
  intermediateLabel,
  destinationLabel,
  enteredLabel,
  exitedLabel,
  language,
  playLabel,
  pauseLabel,
  replayLabel,
}: {
  trip: RideCalculation
  participants: Participant[]
  tripKey: string
  fallbackLabel: string
  loadingLabel: string
  originLabel: string
  intermediateLabel: string
  destinationLabel: string
  enteredLabel: string
  exitedLabel: string
  language: Language
  playLabel: string
  pauseLabel: string
  replayLabel: string
}) {
  const shouldReduceMotion = useReducedMotion()
  const [playbackState, setPlaybackState] = useState<
    'idle' | 'running' | 'paused' | 'finished'
  >('idle')
  const [frameIndex, setFrameIndex] = useState(0)
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
  const isLoadingGeometry = trip.routeGeometryStatus === 'loading'
  const fallbackUsed = trip.routeGeometryStatus === 'fallback' || !hasGeometry
  const narrativeFrames = useMemo(
    () => buildNarrativeFrames(positions, stops, Boolean(shouldReduceMotion)),
    [positions, shouldReduceMotion, stops],
  )
  const currentFrame = narrativeFrames[frameIndex]
  const activeStopIndex = currentFrame?.stopIndex
  const eventMessage =
    activeStopIndex !== undefined
      ? formatStopEvent(
          stops[activeStopIndex],
          activeStopIndex,
          stops.length,
          participants,
          language,
        )
      : ''

  useEffect(() => {
    setPlaybackState('idle')
    setFrameIndex(0)
  }, [tripKey, trip.routeGeometry])

  useEffect(() => {
    if (playbackState !== 'running' || narrativeFrames.length === 0) return
    const timer = window.setInterval(() => {
      setFrameIndex(current => {
        if (current >= narrativeFrames.length - 1) {
          window.clearInterval(timer)
          setPlaybackState('finished')
          return current
        }
        return current + 1
      })
    }, 100)
    return () => window.clearInterval(timer)
  }, [narrativeFrames.length, playbackState])

  const handlePlayback = () => {
    if (playbackState === 'running') {
      setPlaybackState('paused')
      return
    }
    if (playbackState === 'finished') setFrameIndex(0)
    setPlaybackState('running')
  }

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={tripKey}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
        className="glass-panel overflow-hidden rounded-3xl p-3 sm:p-4"
      >
        <div className="relative h-56 overflow-hidden rounded-2xl border border-white/70">
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
                  icon={pointIcon(pointName(index), activeStopIndex === index)}
                  interactive={false}
                />
              ) : null
            )}
            {currentFrame && playbackState !== 'idle' && (
              <Marker
                position={currentFrame.position}
                icon={carIcon()}
                interactive={false}
                zIndexOffset={1000}
              />
            )}
            <FitRoute positions={positions} />
          </MapContainer>
          {isLoadingGeometry && (
            <div className="absolute inset-x-3 top-3 z-[500] rounded-xl bg-white/90 px-3 py-2 text-center text-xs font-medium text-teal-900 shadow-sm backdrop-blur">
              {loadingLabel}
            </div>
          )}
        </div>

        {!isLoadingGeometry && fallbackUsed && (
          <p className="mt-2 text-[11px] text-muted-foreground">{fallbackLabel}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={handlePlayback}
            disabled={isLoadingGeometry || narrativeFrames.length === 0}
            className="h-9 rounded-xl border border-teal-200 bg-white/75 px-3 text-xs font-semibold text-teal-900 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {playbackState === 'running'
              ? pauseLabel
              : playbackState === 'finished'
                ? replayLabel
                : playLabel}
          </motion.button>
          <AnimatePresence mode="wait">
            {eventMessage && playbackState !== 'idle' && (
              <motion.p
                key={`${activeStopIndex}-${eventMessage}`}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl bg-teal-50 px-3 py-2 text-xs font-medium text-teal-900"
              >
                {eventMessage}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

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
