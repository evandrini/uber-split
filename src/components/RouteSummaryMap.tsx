import { useEffect, useMemo, useRef, useState } from 'react'
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
  buildAnimatedStopSummaries,
  buildNarrativeFrames,
  formatStopEvent,
  getAccumulatedParticipationAtStop,
} from '@/utils/routeNarration'
import { formatCurrency } from '@/utils/rideCalculator'
import { getShortStopAddress, getStopLabel } from '@/utils/stopLabels'

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
  skipLabel,
  accumulatedLabel,
  nextLegLabel,
  splitOneLabel,
  splitManyLabel,
  distanceTitle,
  distanceDescription,
  autoPlay = false,
  onPlaybackComplete,
  onSkip,
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
  skipLabel: string
  accumulatedLabel: string
  nextLegLabel: string
  splitOneLabel: string
  splitManyLabel: string
  distanceTitle: string
  distanceDescription: string
  autoPlay?: boolean
  onPlaybackComplete?: () => void
  onSkip?: () => void
}) {
  const shouldReduceMotion = useReducedMotion()
  const autoPlayStartedRef = useRef(false)
  const completionNotifiedRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [playbackState, setPlaybackState] = useState<
    'idle' | 'running' | 'paused' | 'finished'
  >('idle')
  const [frameIndex, setFrameIndex] = useState(0)
  const stops = useMemo(
    () =>
      trip.legs.length > 0
        ? [trip.legs[0].fromStop, ...trip.legs.map(leg => leg.toStop)]
        : [],
    [trip.legs],
  )
  const stopPositions = useMemo(
    () =>
      stops
        .filter(stop => Number.isFinite(stop.lat) && Number.isFinite(stop.lon))
        .map(stop => [stop.lat as number, stop.lon as number] as [number, number]),
    [stops],
  )
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
  const stopSummaries = useMemo(
    () => buildAnimatedStopSummaries(trip, participants),
    [participants, trip],
  )
  const activeSummary =
    activeStopIndex !== undefined ? stopSummaries[activeStopIndex] : undefined
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
  const accumulatedParticipation =
    activeStopIndex !== undefined
      ? getAccumulatedParticipationAtStop(
          trip,
          activeStopIndex,
          participants,
        )
      : []
  const completedLegCount =
    playbackState === 'finished'
      ? trip.legs.length
      : currentFrame?.completedLegCount ?? 0
  const distanceRows = useMemo(() => {
    const rows = participants.map(participant => ({
      participantId: participant.id,
      participantName: participant.name,
      distance: trip.legs
        .slice(0, completedLegCount)
        .reduce(
          (total, leg) =>
            total +
            (leg.passengers.includes(participant.id) ? leg.distance : 0),
          0,
        ),
      finalDistance: trip.legs.reduce(
        (total, leg) =>
          total +
          (leg.passengers.includes(participant.id) ? leg.distance : 0),
        0,
      ),
    }))
    return playbackState === 'finished'
      ? rows.sort((first, second) => second.distance - first.distance)
      : rows
  }, [completedLegCount, participants, playbackState, trip.legs])
  const maximumFinalDistance = Math.max(
    ...distanceRows.map(row => row.finalDistance),
    0,
  )

  useEffect(() => {
    setPlaybackState('idle')
    setFrameIndex(0)
    completionNotifiedRef.current = false
  }, [tripKey, trip.routeGeometry])

  useEffect(() => {
    if (
      !autoPlay ||
      autoPlayStartedRef.current ||
      !mapReady ||
      trip.routeGeometryStatus !== 'ready' ||
      narrativeFrames.length === 0
    ) return

    autoPlayStartedRef.current = true
    if (shouldReduceMotion) {
      setFrameIndex(narrativeFrames.length - 1)
      setPlaybackState('finished')
      return
    }
    setFrameIndex(0)
    setPlaybackState('running')
  }, [
    autoPlay,
    mapReady,
    narrativeFrames.length,
    shouldReduceMotion,
    trip.routeGeometryStatus,
  ])

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

  useEffect(() => {
    if (
      playbackState !== 'finished' ||
      !autoPlay ||
      completionNotifiedRef.current
    ) return
    completionNotifiedRef.current = true
    onPlaybackComplete?.()
  }, [autoPlay, onPlaybackComplete, playbackState])

  const handlePlayback = () => {
    if (playbackState === 'running') {
      setPlaybackState('paused')
      return
    }
    if (playbackState === 'finished') setFrameIndex(0)
    setPlaybackState('running')
  }

  const handleSkip = () => {
    completionNotifiedRef.current = true
    setFrameIndex(Math.max(narrativeFrames.length - 1, 0))
    setPlaybackState('finished')
    onSkip?.()
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
        <div className="relative h-[280px] overflow-hidden rounded-2xl border border-white/70 sm:h-80">
          <MapContainer
            center={center}
            zoom={13}
            whenReady={() => setMapReady(true)}
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
                  icon={pointIcon(getStopLabel(index), activeStopIndex === index)}
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

        <div
          data-testid="route-animation-status"
          className="mt-3 h-[132px] min-h-[132px] overflow-y-auto rounded-2xl bg-teal-50/80 px-3 py-2.5"
        >
          <AnimatePresence mode="wait">
            {eventMessage && playbackState !== 'idle' && (
              <motion.div
                key={`${activeStopIndex}-${eventMessage}`}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium text-teal-900"
              >
                <p className="font-bold">
                  {activeStopIndex !== undefined && (
                    <>{getStopLabel(activeStopIndex)} · </>
                  )}
                  {eventMessage}
                </p>
                {activeSummary?.nextLegCost !== undefined && (
                  <div className="mt-1 space-y-0.5 font-normal">
                    <p>
                      {nextLegLabel}:{' '}
                      {formatCurrency(activeSummary.nextLegCost, language)}
                    </p>
                    <p>
                      {activeSummary.nextLegPassengerCount === 1
                        ? splitOneLabel
                        : splitManyLabel.replace(
                            '{count}',
                            String(activeSummary.nextLegPassengerCount ?? 0),
                          )}
                    </p>
                    {activeSummary.nextLegPassengerIds.map(participantId => {
                      const participant = participants.find(
                        item => item.id === participantId,
                      )
                      return participant ? (
                        <p key={participantId}>
                          {participant.name}: +
                          {formatCurrency(
                            activeSummary.nextLegCostPerPerson ?? 0,
                            language,
                          )}
                        </p>
                      ) : null
                    })}
                  </div>
                )}
                {accumulatedParticipation.length === 1 && (
                  <p className="mt-1 font-normal">
                    {accumulatedLabel}:{' '}
                    {formatCurrency(
                      accumulatedParticipation[0].amount,
                      language,
                    )}
                  </p>
                )}
                {accumulatedParticipation.length > 1 && (
                  <div className="mt-1 space-y-0.5 font-normal">
                    {accumulatedParticipation.map(participation => (
                      <p key={participation.participantId}>
                        {participation.participantName}:{' '}
                        {formatCurrency(participation.amount, language)}
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          data-testid="route-animation-controls"
          className="mt-2 flex h-9 min-h-9 flex-wrap items-center gap-2 overflow-hidden"
        >
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
          {(playbackState === 'running' || playbackState === 'paused') && (
            <button
              type="button"
              onClick={handleSkip}
              className="h-9 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-white/70"
            >
              {skipLabel}
            </button>
          )}
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
                  {getStopLabel(index)} · {shortLabel}
                </p>
                <p
                  className="mt-1 truncate text-[11px] text-muted-foreground"
                  title={stop.address || stop.name}
                >
                  {getShortStopAddress(stop)}
                </p>
                {entering && <p className="truncate text-[11px] text-emerald-700">{entering} {enteredLabel}</p>}
                {exiting && <p className="truncate text-[11px] text-rose-700">{exiting} {exitedLabel}</p>}
              </div>
            )
          })}
        </div>

        <div data-testid="distance-chart" className="mt-4 rounded-2xl bg-white/60 p-3">
          <h3 className="text-sm font-bold text-foreground">{distanceTitle}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {distanceDescription}
          </p>
          <div className="mt-3 space-y-2.5">
            {distanceRows.map(row => {
              const percent =
                maximumFinalDistance > 0
                  ? (row.distance / maximumFinalDistance) * 100
                  : 0
              return (
                <div key={row.participantId} className="space-y-1">
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="font-medium">{row.participantName}</span>
                    <span className="text-muted-foreground">
                      {row.distance.toFixed(1)} km
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      initial={false}
                      animate={{ width: `${percent}%` }}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 220, damping: 26 }
                      }
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  )
}
