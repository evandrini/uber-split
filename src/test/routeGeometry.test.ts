import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Stop } from '@/types/ride'
import { fetchRouteSegment } from '@/components/steps/StopsStep'

const from: Stop = {
  id: 'a', name: 'A', address: 'A', lat: -19.9, lon: -43.9, entering: [], exiting: [],
}
const to: Stop = {
  id: 'b', name: 'B', address: 'B', lat: -19.8, lon: -43.8, entering: [], exiting: [],
}

afterEach(() => vi.restoreAllMocks())

describe('OSRM route geometry', () => {
  it('requests and converts the real GeoJSON route geometry', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [{
          distance: 6500,
          geometry: { coordinates: [[-43.9, -19.9], [-43.8, -19.8]] },
        }],
      }),
    } as Response)

    const result = await fetchRouteSegment(from, to)
    expect(String(fetchMock.mock.calls[0][0])).toContain('overview=full&geometries=geojson')
    expect(result).toEqual({
      distance: 6.5,
      geometry: [[-19.9, -43.9], [-19.8, -43.8]],
    })
  })

  it('returns a safe empty geometry fallback when OSRM fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    await expect(fetchRouteSegment(from, to)).resolves.toEqual({
      distance: 0,
      geometry: [],
    })
  })
})
