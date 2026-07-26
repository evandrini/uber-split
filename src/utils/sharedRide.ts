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

type CompactParticipant = [id: string, name: string]
type CompactStop = [
  label: string,
  lat: number | null,
  lon: number | null,
  entering?: string[],
  exiting?: string[],
]

type CompactTrip = {
  c: number
  y?: string
  s: CompactStop[]
  d: number[]
}

export type CompactSharedRidePayload = {
  v: 1
  l: 'pt-BR' | 'en-US'
  p: CompactParticipant[]
  o?: CompactTrip
  r?: CompactTrip
}

type EncodableSharedRidePayload = SharedRidePayload | CompactSharedRidePayload

const MAX_PAYLOAD_LENGTH = 50_000
const MAX_PARTICIPANTS = 30
const MAX_STOPS = 20

const withoutResidentialDetails = (value: string) =>
  value
    .replace(/^\s*\d+[A-Za-z]?(?:[-/]\d+)?\s*[-,]?\s*/, '')
    .replace(/(?:,\s*|\s+)\d+[A-Za-z]?(?:[-/]\d+)?\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*$/, '')
    .trim()

const compactParticipantId = (index: number) =>
  index < 26 ? String.fromCharCode(97 + index) : `p${index.toString(36)}`

const serializeTrip = (
  trip: RideCalculation,
  includeFullAddresses: boolean,
  participantIdMap: Map<string, string>,
): CompactTrip => {
  const stops =
    trip.legs.length > 0
      ? [trip.legs[0].fromStop, ...trip.legs.map(leg => leg.toStop)]
      : []

  const compactStops = stops.map(stop => {
    const label = includeFullAddresses
      ? stop.address || stop.name
      : withoutResidentialDetails(stop.name || stop.address)
    const entering = stop.entering
      .map(id => participantIdMap.get(id))
      .filter((id): id is string => Boolean(id))
    const exiting = stop.exiting
      .map(id => participantIdMap.get(id))
      .filter((id): id is string => Boolean(id))
    const compactStop: CompactStop = [
      label,
      Number.isFinite(stop.lat) ? stop.lat as number : null,
      Number.isFinite(stop.lon) ? stop.lon as number : null,
    ]

    if (exiting.length > 0) compactStop.push(entering, exiting)
    else if (entering.length > 0) compactStop.push(entering)

    return compactStop
  })

  const compactTrip: CompactTrip = {
    c: trip.totalCost,
    s: compactStops,
    d: trip.legs.map(leg => leg.distance),
  }
  const paidById = trip.paidById
    ? participantIdMap.get(trip.paidById)
    : undefined
  if (paidById) compactTrip.y = paidById

  return compactTrip
}

export const createSharedRidePayload = (
  fullCalculation: FullRideCalculation,
  participants: Participant[],
  language: string,
  includeFullAddresses: boolean,
): CompactSharedRidePayload => {
  const participantIdMap = new Map(
    participants.map((participant, index) => [
      participant.id,
      compactParticipantId(index),
    ]),
  )
  const payload: CompactSharedRidePayload = {
    v: 1,
    l: language === 'pt-BR' ? 'pt-BR' : 'en-US',
    p: participants.map(({ id, name }) => [
      participantIdMap.get(id) as string,
      name,
    ]),
  }

  if (fullCalculation.outbound) {
    payload.o = serializeTrip(
      fullCalculation.outbound,
      includeFullAddresses,
      participantIdMap,
    )
  }
  if (fullCalculation.return) {
    payload.r = serializeTrip(
      fullCalculation.return,
      includeFullAddresses,
      participantIdMap,
    )
  }

  return payload
}

export const encodeSharedRide = (payload: EncodableSharedRidePayload) =>
  compressToEncodedURIComponent(JSON.stringify(payload))

export const createSharedRideUrl = (
  baseUrl: string,
  payload: EncodableSharedRidePayload,
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

const parseLegacyPayload = (value: unknown): SharedRidePayload | null => {
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
}

const parseCompactTrip = (
  value: unknown,
  participantIds: Set<string>,
): SharedTrip | null => {
  if (!value || typeof value !== 'object') return null
  const trip = value as Record<string, unknown>
  if (
    typeof trip.c !== 'number' ||
    !Number.isFinite(trip.c) ||
    trip.c < 0 ||
    (trip.y !== undefined &&
      (typeof trip.y !== 'string' || !participantIds.has(trip.y))) ||
    !Array.isArray(trip.s) ||
    trip.s.length < 2 ||
    trip.s.length > MAX_STOPS ||
    !Array.isArray(trip.d) ||
    trip.d.length !== trip.s.length - 1 ||
    !trip.d.every(
      distance =>
        typeof distance === 'number' &&
        Number.isFinite(distance) &&
        distance >= 0,
    )
  ) return null

  const stops: Array<Omit<Stop, 'id'>> = []
  for (const rawStop of trip.s) {
    if (
      !Array.isArray(rawStop) ||
      rawStop.length < 3 ||
      rawStop.length > 5 ||
      typeof rawStop[0] !== 'string' ||
      rawStop[0].length > 500 ||
      (rawStop[1] !== null &&
        (typeof rawStop[1] !== 'number' || !Number.isFinite(rawStop[1]))) ||
      (rawStop[2] !== null &&
        (typeof rawStop[2] !== 'number' || !Number.isFinite(rawStop[2]))) ||
      (rawStop[3] !== undefined && !isStringArray(rawStop[3])) ||
      (rawStop[4] !== undefined && !isStringArray(rawStop[4]))
    ) return null

    const entering = rawStop[3] ?? []
    const exiting = rawStop[4] ?? []
    if (
      [...entering, ...exiting].some(id => !participantIds.has(id))
    ) return null

    const label = rawStop[0]
    stops.push({
      name: label,
      address: label,
      ...(rawStop[1] === null ? {} : { lat: rawStop[1] }),
      ...(rawStop[2] === null ? {} : { lon: rawStop[2] }),
      entering,
      exiting,
    })
  }

  return {
    cost: trip.c,
    ...(typeof trip.y === 'string' ? { paidById: trip.y } : {}),
    stops,
    legs: trip.d.map(distance => ({ distance })),
  }
}

const parseCompactPayload = (value: unknown): SharedRidePayload | null => {
  if (!value || typeof value !== 'object') return null
  const payload = value as Record<string, unknown>
  if (
    payload.v !== 1 ||
    (payload.l !== 'pt-BR' && payload.l !== 'en-US') ||
    !Array.isArray(payload.p) ||
    payload.p.length < 1 ||
    payload.p.length > MAX_PARTICIPANTS
  ) return null

  const participants: Participant[] = []
  for (const participant of payload.p) {
    if (
      !Array.isArray(participant) ||
      participant.length !== 2 ||
      typeof participant[0] !== 'string' ||
      participant[0].length < 1 ||
      participant[0].length > 100 ||
      typeof participant[1] !== 'string' ||
      participant[1].length < 1 ||
      participant[1].length > 100
    ) return null
    participants.push({ id: participant[0], name: participant[1] })
  }

  const participantIds = new Set(participants.map(participant => participant.id))
  if (participantIds.size !== participants.length) return null

  const outbound = payload.o === undefined
    ? undefined
    : parseCompactTrip(payload.o, participantIds)
  const returnTrip = payload.r === undefined
    ? undefined
    : parseCompactTrip(payload.r, participantIds)
  if (
    (payload.o !== undefined && !outbound) ||
    (payload.r !== undefined && !returnTrip) ||
    (!outbound && !returnTrip)
  ) return null

  return {
    v: 1,
    language: payload.l,
    participants,
    ...(outbound ? { outbound } : {}),
    ...(returnTrip ? { return: returnTrip } : {}),
  }
}

export const decodeSharedRidePayload = (
  value: unknown,
): SharedRidePayload | null =>
  parseCompactPayload(value) ?? parseLegacyPayload(value)

export const decodeSharedRide = (encoded: string): SharedRidePayload | null => {
  if (!encoded || encoded.length > MAX_PAYLOAD_LENGTH) return null

  try {
    const decompressed = decompressFromEncodedURIComponent(encoded)
    if (!decompressed || decompressed.length > MAX_PAYLOAD_LENGTH) return null
    const value = JSON.parse(decompressed) as unknown

    return decodeSharedRidePayload(value)
  } catch {
    return null
  }
}
