import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Plus, Trash2, ArrowRight, ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Stop, Participant, TripData } from '@/types/ride'
import { useLanguage } from '@/i18n/LanguageContext'

interface StopsStepProps {
  hasOutbound: boolean
  hasReturn: boolean
  outboundTrip: TripData
  returnTrip: TripData
  participants: Participant[]
  onOutboundChange: (trip: TripData) => void
  onReturnChange: (trip: TripData) => void
  onNext: () => void
  onBack: () => void
}

////////////////////////////////////////////////////
//////////////// GEO HELPERS //////////////////////
////////////////////////////////////////////////////

const geocodeAddress = async (address: string) => {
  if (!address) return null
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.length) return null
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

const calculateDistance = async (from: any, to: any) => {
  if (!from?.lat || !from?.lon || !to?.lat || !to?.lon) return null
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.routes?.length) return null
    return data.routes[0].distance / 1000
  } catch {
    return null
  }
}

////////////////////////////////////////////////////
/////////////// TRIP EDITOR ///////////////////////
////////////////////////////////////////////////////

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

  const [expandedStop, setExpandedStop] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [activeStopId, setActiveStopId] = useState<string | null>(null)
  const typingTimeout = useRef<any>(null)

  ////////////////////////////////////////////////////
  // AUTOCOMPLETE
  ////////////////////////////////////////////////////

  const searchAddress = (query: string, stopId: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    setActiveStopId(stopId)

    if (typingTimeout.current) clearTimeout(typingTimeout.current)

    typingTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        )
        if (!res.ok) return
        setSuggestions(await res.json())
      } catch { }
    }, 400)
  }

  ////////////////////////////////////////////////////
  // DISTÂNCIA AUTOMÁTICA
  ////////////////////////////////////////////////////

  const updateDistances = async (updatedStops: any[]) => {
    const newLegs: any[] = []

    for (let i = 0; i < updatedStops.length - 1; i++) {
      const km = await calculateDistance(updatedStops[i], updatedStops[i + 1])
      newLegs.push({ distance: km ? Number(km.toFixed(2)) : 0 })
    }

    onChange({ ...trip, stops: updatedStops, legs: newLegs })
  }

  ////////////////////////////////////////////////////

  const addStop = () => {
    const newStop: Stop = {
      id: crypto.randomUUID(),
      name: '',
      address: '',
      entering: [],
      exiting: []
    }
    onChange({ ...trip, stops: [...trip.stops, newStop] })
  }

  ////////////////////////////////////////////////////

  return (
    <div className="space-y-3">
      {trip.stops.map((stop, index) => (
        <div key={stop.id} className="bg-muted/50 rounded-lg p-3">

          {/* HEADER */}
          <div
            className="flex gap-3 items-center justify-between cursor-pointer"
            onClick={() =>
              setExpandedStop(expandedStop === stop.id ? null : stop.id)
            }
          >

            <div className="flex gap-3 items-center w-full">

              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                {index + 1}
              </div>

              <div className="flex-1 relative" onClick={e => e.stopPropagation()}>
                <Input
                  placeholder={index === 0 ? t('origin') : t('addStop')}
                  value={stop.address}
                  onChange={e => {
                    const value = e.target.value
                    onChange({
                      ...trip,
                      stops: trip.stops.map(s =>
                        s.id === stop.id ? { ...s, address: value } : s
                      )
                    })
                    searchAddress(value, stop.id)
                  }}
                  onBlur={async e => {
                    const coords = await geocodeAddress(e.target.value)
                    if (!coords) return
                    const updated = trip.stops.map(s =>
                      s.id === stop.id ? { ...s, ...coords } : s
                    )
                    updateDistances(updated)
                  }}
                />

                {activeStopId === stop.id && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-auto z-50">
                    {suggestions.map((item, i) => (
                      <div
                        key={i}
                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          if (typingTimeout.current) clearTimeout(typingTimeout.current)

                          const updated = trip.stops.map(s =>
                            s.id === stop.id
                              ? {
                                ...s,
                                address: item.display_name,
                                name: item.display_name,
                                lat: parseFloat(item.lat),
                                lon: parseFloat(item.lon)
                              }
                              : s
                          )

                          setSuggestions([])
                          setActiveStopId(null)
                          updateDistances(updated)
                        }}
                      >
                        {item.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange({
                    ...trip,
                    stops: trip.stops.filter(s => s.id !== stop.id)
                  })
                }}
              >
                <Trash2 />
              </Button>

            </div>
          </div>

          {/* EXPANSÃO */}
          {expandedStop === stop.id && (
            <div className="mt-4 space-y-4 border-t pt-4">

              {index > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {t('whoExitsHere')}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {participants.map(p => {
                      const checked = stop.exiting.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const updated = trip.stops.map(s =>
                              s.id === stop.id
                                ? {
                                  ...s,
                                  exiting: checked
                                    ? s.exiting.filter(id => id !== p.id)
                                    : [...s.exiting, p.id]
                                }
                                : s
                            )
                            onChange({ ...trip, stops: updated })
                          }}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${checked
                            ? 'bg-red-100 border-red-400 text-red-700'
                            : 'bg-background border-border hover:border-red-300'
                            }`}
                        >
                          {p.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {index < trip.stops.length - 1 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {t('whoEntersHere')}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {participants.map(p => {
                      const checked = stop.entering.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const updated = trip.stops.map(s =>
                              s.id === stop.id
                                ? {
                                  ...s,
                                  entering: checked
                                    ? s.entering.filter(id => id !== p.id)
                                    : [...s.entering, p.id]
                                }
                                : s
                            )
                            onChange({ ...trip, stops: updated })
                          }}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${checked
                            ? 'bg-green-100 border-green-400 text-green-700'
                            : 'bg-background border-border hover:border-green-300'
                            }`}
                        >
                          {p.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {index < trip.stops.length - 1 && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 h-px bg-border" />
              <div className="px-3 py-1 bg-muted rounded-full text-sm font-semibold">
                {trip.legs[index]?.distance
                  ? `${trip.legs[index].distance} km`
                  : '0 km'}
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

        </div>
      ))}

      <Button variant="outline" onClick={addStop} className="w-full border-dashed">
        <Plus className="mr-2" />
        {t('addStop')}
      </Button>
    </div>
  )
}

////////////////////////////////////////////////////
//////////////// MAIN STEP /////////////////////////
////////////////////////////////////////////////////

export function StopsStep({
  hasOutbound,
  hasReturn,
  outboundTrip,
  returnTrip,
  participants,
  onOutboundChange,
  onReturnChange,
  onNext,
  onBack
}: StopsStepProps) {

  const { t } = useLanguage()

  const reverseOutboundToReturn = async () => {
    if (outboundTrip.stops.length < 2) return

    const reversed = outboundTrip.stops
      .map(s => ({ ...s, id: crypto.randomUUID(), entering: [], exiting: [] }))
      .reverse()

    const newLegs: any[] = []
    for (let i = 0; i < reversed.length - 1; i++) {
      const km = await calculateDistance(reversed[i], reversed[i + 1])
      newLegs.push({ distance: km ? Number(km.toFixed(2)) : 0 })
    }

    onReturnChange({ ...returnTrip, stops: reversed, legs: newLegs })
  }

  const isValid =
    (!hasOutbound || outboundTrip.stops.length >= 2) &&
    (!hasReturn || returnTrip.stops.length >= 2)

  return (
    <div className="space-y-6">

      <div className="text-center mb-6 sm:mb-8">
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl gradient-primary flex items-center justify-center">
          <MapPin className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">
          {t('stopsTitle')}
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground">
          {t('stopsSubtitle')}
        </p>
      </div>


      {hasOutbound && hasReturn ? (
        <Tabs defaultValue="outbound">

          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="outbound">
              <ArrowUpRight /> {t('outboundTrip')}
            </TabsTrigger>
            <TabsTrigger value="return">
              <ArrowDownLeft /> {t('returnTrip')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outbound">
            <TripStopsEditor
              trip={outboundTrip}
              participants={participants}
              onChange={onOutboundChange}
            />
          </TabsContent>

          <TabsContent value="return">
            {outboundTrip.stops.length >= 2 && (
              <Button
                variant="secondary"
                className="mb-3 w-full"
                onClick={reverseOutboundToReturn}
              >
                {t('useReverseRoute')}
              </Button>
            )}

            <TripStopsEditor
              trip={returnTrip}
              participants={participants}
              onChange={onReturnChange}
            />
          </TabsContent>

        </Tabs>
      ) : (
        <TripStopsEditor
          trip={hasOutbound ? outboundTrip : returnTrip}
          participants={participants}
          onChange={hasOutbound ? onOutboundChange : onReturnChange}
        />
      )}

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft /> {t('back')}
        </Button>
        <Button onClick={onNext} disabled={!isValid} className="flex-1">
          {t('calculate')} <ArrowRight />
        </Button>
      </div>

    </div>
  )
}
