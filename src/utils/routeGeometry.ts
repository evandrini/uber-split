import type { Stop } from '@/types/ride'

export type RouteSegmentResult = {
  distance: number
  geometry: [number, number][]
}

const validCoordinates = (stop: Stop) =>
  Number.isFinite(stop.lat) && Number.isFinite(stop.lon)

const parseGeometry = (coordinates: unknown): [number, number][] =>
  Array.isArray(coordinates)
    ? coordinates
        .filter((point): point is [number, number] =>
          Array.isArray(point) &&
          point.length >= 2 &&
          point.every(value => typeof value === 'number' && Number.isFinite(value))
        )
        .map(([lon, lat]) => [lat, lon])
    : []

export const fetchRouteSegment = async (
  from?: Stop,
  to?: Stop,
  signal?: AbortSignal,
): Promise<RouteSegmentResult> => {
  if (!from || !to || !validCoordinates(from) || !validCoordinates(to)) {
    return { distance: 0, geometry: [] }
  }

  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`,
      { signal },
    )
    if (!response.ok) return { distance: 0, geometry: [] }
    const data = await response.json()
    if (!data?.routes?.length) return { distance: 0, geometry: [] }
    return {
      distance: Number((data.routes[0].distance / 1000).toFixed(2)),
      geometry: parseGeometry(data.routes[0]?.geometry?.coordinates),
    }
  } catch (error) {
    if (signal?.aborted) throw error
    return { distance: 0, geometry: [] }
  }
}

export const fetchRouteGeometry = async (
  stops: Stop[],
  signal?: AbortSignal,
): Promise<[number, number][] | null> => {
  const validStops = stops.filter(validCoordinates)
  if (validStops.length < 2 || validStops.length !== stops.length) return null

  const coordinates = validStops
    .map(stop => `${stop.lon},${stop.lat}`)
    .join(';')

  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
      { signal },
    )
    if (!response.ok) return null
    const data = await response.json()
    const geometry = parseGeometry(data.routes?.[0]?.geometry?.coordinates)
    return geometry.length > 1 ? geometry : null
  } catch (error) {
    if (signal?.aborted) throw error
    return null
  }
}

export const getStraightLineGeometry = (stops: Stop[]): [number, number][] =>
  stops
    .filter(validCoordinates)
    .map(stop => [stop.lat as number, stop.lon as number])
