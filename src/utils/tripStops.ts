import type { Leg, Stop } from '@/types/ride'
import { calculateLegs } from '@/utils/rideCalculator'

export const createIntermediateStop = (): Stop => ({
  id: crypto.randomUUID(),
  name: '',
  address: '',
  entering: [],
  exiting: [],
})

export const insertStopBeforeDestination = (stops: Stop[], stop: Stop): Stop[] => {
  const destinationIndex = Math.max(stops.length - 1, 1)
  return [...stops.slice(0, destinationIndex), stop, ...stops.slice(destinationIndex)]
}

export const removeStopById = (stops: Stop[], stopId: string): Stop[] =>
  stops.filter(stop => stop.id !== stopId)

export const clearStopAddress = (stop: Stop): Stop => ({
  ...stop,
  address: '',
  name: '',
  lat: undefined,
  lon: undefined,
  countryCode: undefined,
  country: undefined,
  state: undefined,
  city: undefined,
})

export const rebuildLegs = (
  stops: Stop[],
  previousLegs: Leg[] = [],
  preserveCompatibleDistances = false,
): Leg[] => {
  const distanceByPair = preserveCompatibleDistances
    ? new Map(
        previousLegs.map(leg => [
          `${leg.fromStop.id}->${leg.toStop.id}`,
          leg.distance,
        ]),
      )
    : new Map<string, number>()

  return calculateLegs(stops, []).map(leg => ({
    ...leg,
    distance: distanceByPair.get(`${leg.fromStop.id}->${leg.toStop.id}`) ?? 0,
  }))
}
