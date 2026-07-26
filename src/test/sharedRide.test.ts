import { describe, expect, it } from 'vitest'
import type { FullRideCalculation, Participant, RideCalculation, Stop } from '@/types/ride'
import { calculateCosts, calculateLegs, combineCalculations } from '@/utils/rideCalculator'
import {
  createSharedRidePayload,
  createSharedRideUrl,
  decodeSharedRide,
  encodeSharedRide,
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

describe('shared ride links', () => {
  it('creates and decodes an outbound-only link', () => {
    const payload = createSharedRidePayload(fullRide(), participants, 'pt-BR', true)
    expect(decodeSharedRide(encodeSharedRide(payload))).toEqual(payload)
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
    expect(payload.outbound?.stops[0].address).toBe('Casa')
  })

  it('keeps the GitHub Pages basename in the generated URL', () => {
    const payload = createSharedRidePayload(fullRide(), participants, 'pt-BR', false)
    const url = createSharedRideUrl('https://evandrini.github.io/uber-split/', payload)
    expect(new URL(url).pathname).toBe('/uber-split/')
    expect(new URL(url).searchParams.get('ride')).toBeTruthy()
  })
})
