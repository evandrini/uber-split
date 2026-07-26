import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { FullRideCalculation, Participant, RideCalculation, Stop } from '@/types/ride'

export type SharedRidePayload = {
  v: 1
  language: 'pt-BR' | 'en-US'
  participants: Array<{ id: string; name: string }>
  outbound?: SharedTrip
  return?: SharedTrip
}

export type SharedTrip = {
  cost: number
  paidById?: string
  stops: Array<Omit<Stop, 'id'>>
  legs: Array<{ distance: number }>
}

const MAX_PAYLOAD_LENGTH = 50_000
const MAX_PARTICIPANTS = 30
const MAX_STOPS = 20

const withoutResidentialDetails = (value: string) =>
  value
    .replace(/\b\d+[A-Za-z]?(?:[-/]\d+)?\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .trim()

const serializeTrip = (
  trip: RideCalculation,
  includeFullAddresses: boolean,
  participantIdMap: Map<string, string>,
): SharedTrip => {
  const stops =
    trip.legs.length > 0
      ? [trip.legs[0].fromStop, ...trip.legs.map(leg => leg.toStop)]
      : []

  return {
    cost: trip.totalCost,
    paidById: trip.paidById ? participantIdMap.get(trip.paidById) : undefined,
    stops: stops.map(stop => ({
      name: includeFullAddresses ? stop.name : withoutResidentialDetails(stop.name),
      address: includeFullAddresses
        ? stop.address
        : withoutResidentialDetails(stop.name || stop.address),
      lat: stop.lat,
      lon: stop.lon,
      entering: stop.entering
        .map(id => participantIdMap.get(id))
        .filter((id): id is string => Boolean(id)),
      exiting: stop.exiting
        .map(id => participantIdMap.get(id))
        .filter((id): id is string => Boolean(id)),
    })),
    legs: trip.legs.map(leg => ({ distance: leg.distance })),
  }
}

export const createSharedRidePayload = (
  fullCalculation: FullRideCalculation,
  participants: Participant[],
  language: string,
  includeFullAddresses: boolean,
): SharedRidePayload => {
  const participantIdMap = new Map(
    participants.map((participant, index) => [participant.id, `p${index}`]),
  )

  return {
    v: 1,
    language: language === 'pt-BR' ? 'pt-BR' : 'en-US',
    participants: participants.map(({ id, name }) => ({
      id: participantIdMap.get(id) as string,
      name,
    })),
    outbound: fullCalculation.outbound
      ? serializeTrip(fullCalculation.outbound, includeFullAddresses, participantIdMap)
      : undefined,
    return: fullCalculation.return
      ? serializeTrip(fullCalculation.return, includeFullAddresses, participantIdMap)
      : undefined,
  }
}

export const encodeSharedRide = (payload: SharedRidePayload) =>
  compressToEncodedURIComponent(JSON.stringify(payload))

export const createSharedRideUrl = (
  baseUrl: string,
  payload: SharedRidePayload,
) => {
  const url = new URL(baseUrl)
  url.searchParams.set('ride', encodeSharedRide(payload))
  return url.toString()
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= MAX_PARTICIPANTS &&
  value.every(item => typeof item === 'string' && item.length <= 100)

const isValidStop = (value: unknown): value is Omit<Stop, 'id'> => {
  if (!value || typeof value !== 'object') return false
  const stop = value as Record<string, unknown>
  const validCoordinate = (coordinate: unknown) =>
    coordinate === undefined ||
    (typeof coordinate === 'number' && Number.isFinite(coordinate))

  return (
    typeof stop.name === 'string' &&
    stop.name.length <= 300 &&
    typeof stop.address === 'string' &&
    stop.address.length <= 500 &&
    validCoordinate(stop.lat) &&
    validCoordinate(stop.lon) &&
    isStringArray(stop.entering) &&
    isStringArray(stop.exiting)
  )
}

const isValidTrip = (value: unknown, participantIds: Set<string>): value is SharedTrip => {
  if (!value || typeof value !== 'object') return false
  const trip = value as Record<string, unknown>
  if (
    typeof trip.cost !== 'number' ||
    !Number.isFinite(trip.cost) ||
    trip.cost < 0 ||
    (trip.paidById !== undefined &&
      (typeof trip.paidById !== 'string' || !participantIds.has(trip.paidById))) ||
    !Array.isArray(trip.stops) ||
    trip.stops.length < 2 ||
    trip.stops.length > MAX_STOPS ||
    !trip.stops.every(isValidStop) ||
    !Array.isArray(trip.legs) ||
    trip.legs.length !== trip.stops.length - 1
  ) return false

  const stopIdsValid = trip.stops.every(rawStop => {
    const stop = rawStop as Omit<Stop, 'id'>
    return [...stop.entering, ...stop.exiting].every(id => participantIds.has(id))
  })

  return (
    stopIdsValid &&
    trip.legs.every(rawLeg => {
      if (!rawLeg || typeof rawLeg !== 'object') return false
      const distance = (rawLeg as Record<string, unknown>).distance
      return typeof distance === 'number' && Number.isFinite(distance) && distance >= 0
    })
  )
}

export const decodeSharedRide = (encoded: string): SharedRidePayload | null => {
  if (!encoded || encoded.length > MAX_PAYLOAD_LENGTH) return null

  try {
    const decompressed = decompressFromEncodedURIComponent(encoded)
    if (!decompressed || decompressed.length > MAX_PAYLOAD_LENGTH) return null
    const value = JSON.parse(decompressed) as unknown
    if (!value || typeof value !== 'object') return null
    const payload = value as Record<string, unknown>

    if (
      payload.v !== 1 ||
      (payload.language !== 'pt-BR' && payload.language !== 'en-US') ||
      !Array.isArray(payload.participants) ||
      payload.participants.length < 1 ||
      payload.participants.length > MAX_PARTICIPANTS
    ) return null

    const participantsValid = payload.participants.every(participant => {
      if (!participant || typeof participant !== 'object') return false
      const item = participant as Record<string, unknown>
      return (
        typeof item.id === 'string' &&
        item.id.length > 0 &&
        item.id.length <= 100 &&
        typeof item.name === 'string' &&
        item.name.length > 0 &&
        item.name.length <= 100
      )
    })
    if (!participantsValid) return null

    const participantIds = new Set(
      (payload.participants as Array<{ id: string }>).map(participant => participant.id),
    )
    if (participantIds.size !== payload.participants.length) return null

    const outboundValid =
      payload.outbound === undefined || isValidTrip(payload.outbound, participantIds)
    const returnValid =
      payload.return === undefined || isValidTrip(payload.return, participantIds)
    if (!outboundValid || !returnValid || (!payload.outbound && !payload.return)) return null

    return payload as SharedRidePayload
  } catch {
    return null
  }
}
