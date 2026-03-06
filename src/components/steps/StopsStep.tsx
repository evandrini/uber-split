import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import {
  DndContext,
  closestCenter,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  MapPin,
  Plus,
  Repeat2,
  Trash2
} from 'lucide-react'
import type { DragEndEvent } from '@dnd-kit/core'

import type { Participant, Stop, TripData } from '@/types/ride'
import { useLanguage } from '@/i18n/LanguageContext'

type AddressSuggestion = {
  display_name: string
  lat: string
  lon: string
}

const MIN_STOPS = 2

const geocodeAddress = async (address: string) => {
  if (!address.trim()) return null

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    )

    if (!res.ok) return null

    const data = (await res.json()) as AddressSuggestion[]
    if (!data.length) return null

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon)
    }
  } catch {
    return null
  }
}

const fetchAddressSuggestions = async (query: string) => {
  if (query.trim().length < 3) return []

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
    )

    if (!res.ok) return []

    return (await res.json()) as AddressSuggestion[]
  } catch {
    return []
  }
}

const calculateDistanceKm = async (from?: Stop, to?: Stop) => {
  if (!from?.lat || !from?.lon || !to?.lat || !to?.lon) return 0

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`
    )

    if (!res.ok) return 0

    const data = await res.json()
    if (!data?.routes?.length) return 0

    return Number((data.routes[0].distance / 1000).toFixed(2))
  } catch {
    return 0
  }
}

function FloatingCard({ label }: { label?: string }) {
  return (
    <motion.div
      initial={{ scale: 0.95, rotate: -1 }}
      animate={{ scale: 1.03, rotate: 0, y: -3 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="rounded-2xl border border-border/80 bg-card/90 px-4 py-3 shadow-2xl backdrop-blur-xl"
    >
      <p className="max-w-[260px] truncate text-sm font-semibold text-foreground">
        {label || 'Moving...'}
      </p>
    </motion.div>
  )
}

function SortableStop({
  id,
  children
}: {
  id: string
  children: (props: {
    dragHandleProps: Record<string, unknown>
    isDragging: boolean
  }) => React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({
        dragHandleProps: {
          ...attributes,
          ...listeners
        },
        isDragging
      })}
    </div>
  )
}

function TripStopsEditor({
  trip,
  participants,
  onChange
}: {
  trip: TripData
  participants: Participant[]
  onChange: (trip: TripData) => void
}) {
  const { t } = useLanguage()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeStopId, setActiveStopId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current)
      }
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 140, tolerance: 6 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const stopIds = useMemo(() => trip.stops.map(stop => stop.id), [trip.stops])

  const dropAnimation = {
    duration: 320,
    easing: 'cubic-bezier(0.22,1,0.36,1)',
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.35', transform: 'scale(0.98)' } }
    })
  }

  const updateTripWithDistances = async (updatedStops: Stop[]) => {
    const nextDistances = await Promise.all(
      updatedStops
        .slice(0, -1)
        .map((fromStop, index) => calculateDistanceKm(fromStop, updatedStops[index + 1]))
    )

    const nextLegs = updatedStops.slice(0, -1).map((fromStop, index) => ({
      fromStop,
      toStop: updatedStops[index + 1],
      passengers: trip.legs[index]?.passengers ?? [],
      distance: nextDistances[index] ?? 0
    }))

    onChange({
      ...trip,
      stops: updatedStops,
      legs: nextLegs
    })
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = trip.stops.findIndex(stop => stop.id === active.id)
    const newIndex = trip.stops.findIndex(stop => stop.id === over.id)

    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(trip.stops, oldIndex, newIndex)
    await updateTripWithDistances(reordered)
  }

  const addStop = () => {
    const nextStop: Stop = {
      id: crypto.randomUUID(),
      name: '',
      address: '',
      entering: [],
      exiting: []
    }

    onChange({
      ...trip,
      stops: [...trip.stops, nextStop]
    })
  }

  const removeStop = async (stopId: string) => {
    if (trip.stops.length <= MIN_STOPS) return

    const updatedStops = trip.stops.filter(stop => stop.id !== stopId)
    await updateTripWithDistances(updatedStops)
  }

  const updateStop = async (stopId: string, updater: (stop: Stop) => Stop) => {
    const updatedStops = trip.stops.map(stop =>
      stop.id === stopId ? updater(stop) : stop
    )

    onChange({
      ...trip,
      stops: updatedStops
    })
  }

  const searchAddress = (query: string, stopId: string) => {
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current)
    }

    if (query.trim().length < 3) {
      setSuggestions([])
      setActiveStopId(null)
      return
    }

    setActiveStopId(stopId)

    typingTimeout.current = setTimeout(async () => {
      const result = await fetchAddressSuggestions(query)
      setSuggestions(result)
    }, 300)
  }

  const dragHint = t('dragHint') as string

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{dragHint}</p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={event => setActiveId(String(event.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={stopIds} strategy={verticalListSortingStrategy}>
          {trip.stops.map((stop, index) => (
            <SortableStop key={stop.id} id={stop.id}>
              {({ dragHandleProps, isDragging }) => (
                <motion.article
                  layout
                  transition={{ type: 'spring', stiffness: 430, damping: 32 }}
                  className={`rounded-2xl border border-border/80 bg-card/90 p-4 shadow-[0_10px_35px_hsl(var(--primary)/0.08)] backdrop-blur-xl sm:p-5 ${
                    isDragging ? 'scale-[0.99] opacity-40' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      {...dragHandleProps}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/80 bg-muted/70 text-muted-foreground transition active:scale-95"
                      aria-label={dragHint}
                    >
                      <GripVertical size={18} />
                    </button>

                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {index + 1}
                    </div>

                    <div className="relative min-w-0 flex-1">
                      <Input
                        placeholder={index === 0 ? (t('origin') as string) : (t('addStop') as string)}
                        value={stop.address}
                        onChange={event => {
                          const value = event.target.value

                          updateStop(stop.id, current => ({
                            ...current,
                            address: value
                          }))

                          searchAddress(value, stop.id)
                        }}
                        onBlur={async event => {
                          const coords = await geocodeAddress(event.target.value)
                          if (!coords) return

                          const updatedStops = trip.stops.map(current =>
                            current.id === stop.id
                              ? {
                                  ...current,
                                  ...coords
                                }
                              : current
                          )

                          await updateTripWithDistances(updatedStops)
                        }}
                      />

                      {activeStopId === stop.id && suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-popover shadow-xl">
                          {suggestions.map(item => (
                            <button
                              key={`${item.display_name}-${item.lat}-${item.lon}`}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-muted"
                              onMouseDown={event => {
                                event.preventDefault()

                                const updatedStops = trip.stops.map(current =>
                                  current.id === stop.id
                                    ? {
                                        ...current,
                                        address: item.display_name,
                                        name: item.display_name,
                                        lat: parseFloat(item.lat),
                                        lon: parseFloat(item.lon)
                                      }
                                    : current
                                )

                                setSuggestions([])
                                setActiveStopId(null)
                                updateTripWithDistances(updatedStops)
                              }}
                            >
                              {item.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStop(stop.id)}
                      disabled={trip.stops.length <= MIN_STOPS}
                      aria-label="Remove stop"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-4 space-y-4 border-t border-border/70 pt-4">
                    <span className="text-sm font-semibold">{t('stopConfiguration') as string}</span>

                    {index > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{t('whoExitsHere') as string}</p>
                        <div className="flex flex-wrap gap-2">
                          {participants.map(participant => {
                            const isChecked = stop.exiting.includes(participant.id)

                            return (
                              <button
                                key={participant.id}
                                type="button"
                                onClick={() => {
                                  const updatedStops = trip.stops.map(current =>
                                    current.id === stop.id
                                      ? {
                                          ...current,
                                          exiting: isChecked
                                            ? current.exiting.filter(id => id !== participant.id)
                                            : [...current.exiting, participant.id]
                                        }
                                      : current
                                  )

                                  onChange({ ...trip, stops: updatedStops })
                                }}
                                className={`rounded-xl border px-3 py-2 text-sm transition ${
                                  isChecked
                                    ? 'border-red-300 bg-red-50 text-red-700'
                                    : 'border-border bg-background text-foreground'
                                }`}
                              >
                                {participant.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {index < trip.stops.length - 1 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{t('whoEntersHere') as string}</p>
                        <div className="flex flex-wrap gap-2">
                          {participants.map(participant => {
                            const isChecked = stop.entering.includes(participant.id)

                            return (
                              <button
                                key={participant.id}
                                type="button"
                                onClick={() => {
                                  const updatedStops = trip.stops.map(current =>
                                    current.id === stop.id
                                      ? {
                                          ...current,
                                          entering: isChecked
                                            ? current.entering.filter(id => id !== participant.id)
                                            : [...current.entering, participant.id]
                                        }
                                      : current
                                  )

                                  onChange({ ...trip, stops: updatedStops })
                                }}
                                className={`rounded-xl border px-3 py-2 text-sm transition ${
                                  isChecked
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : 'border-border bg-background text-foreground'
                                }`}
                              >
                                {participant.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {index < trip.stops.length - 1 && (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold sm:text-sm">
                        {trip.legs[index]?.distance ? `${trip.legs[index].distance} km` : '0 km'}
                      </div>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                </motion.article>
              )}
            </SortableStop>
          ))}
        </SortableContext>

        <DragOverlay dropAnimation={dropAnimation} adjustScale={false}>
          {activeId ? (
            <FloatingCard
              label={trip.stops.find(stop => stop.id === activeId)?.address}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        onClick={addStop}
        className="w-full border-dashed"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('addStop') as string}
      </Button>
    </div>
  )
}

interface StopsStepProps {
  hasOutbound: boolean
  hasReturn: boolean
  outboundTrip: TripData
  returnTrip: TripData
  participants: Participant[]
  onOutboundChange: (trip: TripData) => void
  onReturnChange: (trip: TripData) => void
  onApplyReverseReturn: () => void
  onBack: () => void
  onNext: () => void
}

const tripHasMinimumStructure = (trip: TripData) => trip.stops.length >= MIN_STOPS

const tripHasAddresses = (trip: TripData) =>
  trip.stops.every(stop => stop.address.trim().length > 0)

export function StopsStep({
  hasOutbound,
  hasReturn,
  outboundTrip,
  returnTrip,
  participants,
  onOutboundChange,
  onReturnChange,
  onApplyReverseReturn,
  onBack,
  onNext
}: StopsStepProps) {
  const { t } = useLanguage()

  const [activeTab, setActiveTab] = useState<'outbound' | 'return'>(
    hasOutbound ? 'outbound' : 'return'
  )

  useEffect(() => {
    if (!hasOutbound && hasReturn) {
      setActiveTab('return')
      return
    }

    if (hasOutbound && !hasReturn) {
      setActiveTab('outbound')
    }
  }, [hasOutbound, hasReturn])

  const outboundReady =
    !hasOutbound ||
    (tripHasMinimumStructure(outboundTrip) && tripHasAddresses(outboundTrip))

  const returnReady =
    !hasReturn ||
    (tripHasMinimumStructure(returnTrip) && tripHasAddresses(returnTrip))

  const canCalculate = outboundReady && returnReady
  const canCopyOutboundToReturn = hasOutbound && hasReturn && tripHasAddresses(outboundTrip)
  const copyReturnLabel = t('copyOutboundToReturn') as string
  const copyReturnHint = t('autoFillReturnHint') as string

  return (
    <div className="animate-fade-in space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl gradient-primary">
          <MapPin className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">
          {t('stopsTitle') as string}
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          {t('stopsSubtitle') as string}
        </p>
      </div>

      {hasOutbound && hasReturn ? (
        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'outbound' | 'return')}>
          <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1">
            <TabsTrigger value="outbound" className="rounded-xl text-sm sm:text-base">
              {t('outboundTrip') as string}
            </TabsTrigger>
            <TabsTrigger value="return" className="rounded-xl text-sm sm:text-base">
              {t('returnTrip') as string}
            </TabsTrigger>
          </TabsList>

          {activeTab === 'return' && (
            <div className="mt-4 rounded-2xl border border-border/80 bg-card/85 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{copyReturnLabel}</p>
                  <p className="text-xs text-muted-foreground">{copyReturnHint}</p>
                </div>
                <Button
                  type="button"
                  onClick={onApplyReverseReturn}
                  disabled={!canCopyOutboundToReturn}
                  className="rounded-xl gradient-primary"
                >
                  <Repeat2 className="mr-2 h-4 w-4" />
                  {t('autoLabel') as string}
                </Button>
              </div>
            </div>
          )}

          <TabsContent value="outbound" className="mt-4">
            <TripStopsEditor
              trip={outboundTrip}
              participants={participants}
              onChange={onOutboundChange}
            />
          </TabsContent>

          <TabsContent value="return" className="mt-4">
            <TripStopsEditor
              trip={returnTrip}
              participants={participants}
              onChange={onReturnChange}
            />
          </TabsContent>
        </Tabs>
      ) : hasOutbound ? (
        <TripStopsEditor
          trip={outboundTrip}
          participants={participants}
          onChange={onOutboundChange}
        />
      ) : (
        <TripStopsEditor
          trip={returnTrip}
          participants={participants}
          onChange={onReturnChange}
        />
      )}

      {!outboundReady && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t('outboundRouteRequired') as string}
        </p>
      )}

      {!returnReady && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t('returnRouteRequired') as string}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="h-11 flex-1 sm:h-12">
          <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          {t('back') as string}
        </Button>

        <Button
          type="button"
          onClick={onNext}
          disabled={!canCalculate}
          className="h-11 flex-1 gradient-primary text-base font-semibold sm:h-12"
        >
          {t('calculate') as string}
          <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  )
}






