import { describe, expect, it } from 'vitest'
import type { FullRideCalculation, Participant, RideCalculation, Stop } from '@/types/ride'
import { calculateCosts, calculateLegs, combineCalculations } from '@/utils/rideCalculator'
import {
  createSharedRidePayload,
  createSharedRideUrl,
  decodeSharedRide,
  encodeSharedRide,
  type SharedRidePayload,
} from '@/utils/sharedRide'

const participants: Participant[] = [
  { id: 'bruno', name: 'Bruno' },
  { id: 'evandro', name: 'Evandro' },
]

const stops: Stop[] = [
  { id: 'a', name: 'Casa 84', address: 'Rua Vertentes, 84', lat: -19.9, lon: -43.9, entering: ['bruno'], exiting: [] },
  { id: 'b', name: 'Praça', address: 'Praça Central', lat: -19.91, lon: -43.91, entering: ['evandro'], exiting: [] },
  { id: 'c', name: 'Parque', address: 'Parque Municipal', lat: -19.92, lon: -43.92, entering: [], exiting: ['bruno', 'evandro'] },
]

const trip = (cost = 30): RideCalculation => {
  const legs = calculateLegs(stops, participants).map(leg => ({ ...leg, distance: 10 }))
  return calculateCosts(cost, legs, participants, 'bruno')
}

const fullRide = (withReturn = false): FullRideCalculation =>
  combineCalculations(trip(), withReturn ? trip(20) : undefined, participants)

const legacyPayload = (): SharedRidePayload => ({
  v: 1,
  language: 'pt-BR',
  participants: [
    { id: 'p0', name: 'Bruno' },
    { id: 'p1', name: 'Evandro' },
  ],
  outbound: {
    cost: 30,
    paidById: 'p0',
    stops: stops.map(stop => ({
      name: stop.name,
      address: stop.address,
      lat: stop.lat,
      lon: stop.lon,
      entering: stop.entering.map(id => id === 'bruno' ? 'p0' : 'p1'),
      exiting: stop.exiting.map(id => id === 'bruno' ? 'p0' : 'p1'),
    })),
    legs: [{ distance: 10 }, { distance: 10 }],
  },
})

describe('shared ride links', () => {
  it('creates and decodes an outbound-only link', () => {
    const payload = createSharedRidePayload(fullRide(), participants, 'pt-BR', true)
    const decoded = decodeSharedRide(encodeSharedRide(payload))
    expect(decoded?.language).toBe('pt-BR')
    expect(decoded?.participants).toEqual([
      { id: 'a', name: 'Bruno' },
      { id: 'b', name: 'Evandro' },
    ])
    expect(decoded?.outbound?.cost).toBe(30)
  })

  it('creates and decodes outbound and return trips separately', () => {
    const payload = createSharedRidePayload(fullRide(true), participants, 'en-US', true)
    const decoded = decodeSharedRide(encodeSharedRide(payload))
    expect(decoded?.outbound?.cost).toBe(30)
    expect(decoded?.return?.cost).toBe(20)
  })

  it('reconstructs the same financial result through the calculation engine', () => {
    const payload = decodeSharedRide(
      encodeSharedRide(createSharedRidePayload(fullRide(), participants, 'pt-BR', true)),
    )!
    const restoredStops = payload.outbound!.stops.map((stop, index) => ({
      ...stop,
      id: `restored-${index}`,
    }))
    const restoredLegs = calculateLegs(restoredStops, payload.participants).map((leg, index) => ({
      ...leg,
      distance: payload.outbound!.legs[index].distance,
    }))
    const restored = calculateCosts(
      payload.outbound!.cost,
      restoredLegs,
      payload.participants,
      payload.outbound!.paidById,
    )
    expect(restored.participantCosts.map(cost => cost.totalCost)).toEqual(
      trip().participantCosts.map(cost => cost.totalCost),
    )
  })

  it('rejects malformed and unsupported payloads', () => {
    expect(decodeSharedRide('not-valid')).toBeNull()
    expect(decodeSharedRide(encodeSharedRide({ v: 2 } as never))).toBeNull()
  })

  it('removes residential numbers when address details are hidden', () => {
    const payload = createSharedRidePayload(fullRide(), participants, 'pt-BR', false)
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain('84')
    expect(decodeSharedRide(encodeSharedRide(payload))?.outbound?.stops[0].address).toBe('Casa')
  })

  it('keeps the GitHub Pages basename in the generated URL', () => {
    const payload = createSharedRidePayload(fullRide(), participants, 'pt-BR', false)
    const url = createSharedRideUrl('https://evandrini.github.io/uber-split/', payload)
    expect(new URL(url).pathname).toBe('/uber-split/')
    expect(new URL(url).searchParams.get('ride')).toBeTruthy()
  })

  it('uses short participant IDs and never serializes route geometry or debug data', () => {
    const ride = fullRide()
    if (ride.outbound) {
      ride.outbound.routeGeometry = [[-19.9, -43.9], [-19.8, -43.8]]
    }
    const payload = createSharedRidePayload(ride, participants, 'pt-BR', true)
    const serialized = JSON.stringify(payload)

    expect(payload.p.map(participant => participant[0])).toEqual(['a', 'b'])
    expect(serialized).not.toContain('routeGeometry')
    expect(serialized).not.toContain('debug')
    expect(serialized).not.toContain('participantCosts')
    expect(serialized).not.toContain('legBreakdown')
    expect(serialized).not.toContain('"name"')
    expect(serialized).not.toContain('"address"')
    expect(serialized).not.toContain('"distance"')
  })

  it('decodes legacy verbose links after trying the compact format', () => {
    expect(decodeSharedRide(encodeSharedRide(legacyPayload()))).toEqual(legacyPayload())
  })

  it('creates a shorter URL than the legacy verbose payload', () => {
    const baseUrl = 'https://evandrini.github.io/uber-split/'
    const compactUrl = createSharedRideUrl(
      baseUrl,
      createSharedRidePayload(fullRide(), participants, 'pt-BR', true),
    )
    const legacyUrl = createSharedRideUrl(baseUrl, legacyPayload())

    expect(compactUrl.length).toBeLessThan(legacyUrl.length)
  })
})
