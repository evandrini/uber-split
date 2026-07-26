import { describe, expect, it, vi } from 'vitest'
import {
  createSharedRideStorage,
  createShortRideUrl,
  isValidShortRideId,
} from '@/utils/sharedRideStorage'
import type { CompactSharedRidePayload } from '@/utils/sharedRide'

const payload: CompactSharedRidePayload = {
  v: 1,
  l: 'pt-BR',
  p: [['a', 'Bruno']],
  o: {
    c: 20,
    y: 'a',
    s: [
      ['Origem', -19.9, -43.9, ['a']],
      ['Destino', -19.8, -43.8, [], ['a']],
    ],
    d: [10],
  },
}

describe('shared ride RPC storage', () => {
  it('creates only through create_shared_ride', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: 'K8mP2xQz',
      error: null,
    })
    const storage = createSharedRideStorage({ rpc } as never)

    await expect(storage.create(payload)).resolves.toBe('K8mP2xQz')
    expect(rpc).toHaveBeenCalledWith('create_shared_ride', {
      p_payload: payload,
    })
  })

  it('reads only through get_shared_ride and validates its payload', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ status: 'ok', payload }],
      error: null,
    })
    const storage = createSharedRideStorage({ rpc } as never)
    const result = await storage.get('K8mP2xQz')

    expect(rpc).toHaveBeenCalledWith('get_shared_ride', {
      p_id: 'K8mP2xQz',
    })
    expect(result.status).toBe('ok')
    expect(result.payload?.outbound?.cost).toBe(20)
  })

  it('rejects malformed IDs without contacting Supabase', async () => {
    const rpc = vi.fn()
    const storage = createSharedRideStorage({ rpc } as never)

    await expect(storage.get('bad id')).resolves.toEqual({
      status: 'invalid',
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('creates a short URL with only the s parameter', () => {
    const url = createShortRideUrl(
      'https://evandrini.github.io/uber-split/?ride=old',
      'K8mP2xQz',
    )

    expect(isValidShortRideId('K8mP2xQz')).toBe(true)
    expect(new URL(url).searchParams.get('s')).toBe('K8mP2xQz')
    expect(new URL(url).searchParams.has('ride')).toBe(false)
  })
})
