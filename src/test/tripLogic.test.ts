import { describe, expect, it } from 'vitest'
import type { Participant, Stop } from '@/types/ride'
import { calculateCosts, calculateLegs } from '@/utils/rideCalculator'
import {
  clearStopAddress,
  insertStopBeforeDestination,
  rebuildLegs,
  removeStopById,
} from '@/utils/tripStops'

const participants: Participant[] = [
  { id: 'bruno', name: 'Bruno' },
  { id: 'evandro', name: 'Evandro' },
]

const stop = (
  id: string,
  entering: string[] = [],
  exiting: string[] = [],
): Stop => ({
  id,
  name: id,
  address: `Rua ${id}`,
  lat: -19,
  lon: -44,
  entering,
  exiting,
})

describe('trip stop lifecycle', () => {
  it('inserts a new stop immediately before the final destination', () => {
    const origin = stop('origin')
    const destination = stop('destination')
    const intermediate = stop('intermediate')

    expect(
      insertStopBeforeDestination([origin, destination], intermediate).map(item => item.id),
    ).toEqual(['origin', 'intermediate', 'destination'])
  })

  it('removes an intermediate stop and rebuilds compatible legs without ghosts', () => {
    const stops = [stop('a'), stop('b'), stop('c'), stop('d')]
    const oldLegs = calculateLegs(stops, participants).map((leg, index) => ({
      ...leg,
      distance: index + 1,
    }))
    const updatedStops = removeStopById(stops, 'b')
    const legs = rebuildLegs(updatedStops, oldLegs, true)

    expect(updatedStops.map(item => item.id)).toEqual(['a', 'c', 'd'])
    expect(legs.map(leg => `${leg.fromStop.id}->${leg.toStop.id}`)).toEqual([
      'a->c',
      'c->d',
    ])
    expect(legs.map(leg => leg.distance)).toEqual([0, 3])
  })

  it('clears stale coordinates and makes rebuilt distances zero', () => {
    const cleared = clearStopAddress(stop('b'))
    const legs = rebuildLegs([stop('a'), cleared, stop('c')])

    expect(cleared).toMatchObject({ address: '', name: '', lat: undefined, lon: undefined })
    expect(legs.every(leg => leg.distance === 0)).toBe(true)
  })

  it('removes the active autocomplete stop from the route data cleanly', () => {
    const stops = [stop('a'), stop('active'), stop('c')]
    expect(removeStopById(stops, 'active').some(item => item.id === 'active')).toBe(false)
  })
})

describe('financial breakdown source of truth', () => {
  it('keeps outbound and return calculations separated', () => {
    const outboundLegs = calculateLegs([stop('a', ['bruno']), stop('b'), stop('c', [], ['bruno'])], participants)
      .map((leg, index) => ({ ...leg, distance: index === 0 ? 6 : 10 }))
    const returnLegs = calculateLegs([stop('c', ['bruno']), stop('b'), stop('a', [], ['bruno'])], participants)
      .map((leg, index) => ({ ...leg, distance: index === 0 ? 7 : 9 }))

    const outbound = calculateCosts(32, outboundLegs, participants)
    const returnTrip = calculateCosts(40, returnLegs, participants)

    expect(outbound.legBreakdown.map(leg => leg.distance)).toEqual([6, 10])
    expect(returnTrip.legBreakdown.map(leg => leg.distance)).toEqual([7, 9])
  })

  it('charges Bruno alone on A-B and splits B-C with Evandro', () => {
    const stops = [
      stop('a', ['bruno']),
      stop('b', ['evandro']),
      stop('c', [], ['bruno', 'evandro']),
    ]
    const legs = calculateLegs(stops, participants).map(leg => ({ ...leg, distance: 10 }))
    const result = calculateCosts(30, legs, participants)

    expect(result.legBreakdown[0]).toMatchObject({
      passengerNames: ['Bruno'],
      totalLegCost: 15,
      costPerPassenger: 15,
    })
    expect(result.legBreakdown[1]).toMatchObject({
      passengerNames: ['Bruno', 'Evandro'],
      totalLegCost: 15,
      costPerPassenger: 7.5,
    })
    expect(result.participantCosts.find(cost => cost.participantId === 'bruno')?.totalCost).toBe(22.5)
    expect(result.participantCosts.find(cost => cost.participantId === 'evandro')?.totalCost).toBe(7.5)
  })

  it('recalculates passengers in reverse stop order', () => {
    const reverseStops = [
      stop('c', ['bruno', 'evandro']),
      stop('b', [], ['evandro']),
      stop('a', [], ['bruno']),
    ]
    const legs = calculateLegs(reverseStops, participants)

    expect(legs[0].passengers).toEqual(['bruno', 'evandro'])
    expect(legs[1].passengers).toEqual(['bruno'])
  })
})
