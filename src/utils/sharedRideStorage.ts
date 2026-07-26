import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import {
  decodeSharedRidePayload,
  type CompactSharedRidePayload,
  type SharedRidePayload,
} from '@/utils/sharedRide'

const SHORT_ID_PATTERN = /^[A-Za-z0-9_-]{8}$/

export type SharedRideLookupStatus =
  | 'ok'
  | 'expired'
  | 'not_found'
  | 'invalid'
  | 'unavailable'

export type SharedRideLookup = {
  status: SharedRideLookupStatus
  payload?: SharedRidePayload
}

type RpcClient = Pick<SupabaseClient, 'rpc'>

export const isValidShortRideId = (id: string) =>
  SHORT_ID_PATTERN.test(id)

export const createShortRideUrl = (baseUrl: string, id: string) => {
  if (!isValidShortRideId(id)) throw new Error('Invalid shared ride ID')
  const url = new URL(baseUrl)
  url.search = ''
  url.searchParams.set('s', id)
  return url.toString()
}

export const createSharedRideStorage = (client: RpcClient | null) => ({
  async create(payload: CompactSharedRidePayload): Promise<string> {
    if (!client || !decodeSharedRidePayload(payload)) {
      throw new Error('Shared ride storage unavailable')
    }

    const { data, error } = await client.rpc('create_shared_ride', {
      p_payload: payload,
    })
    if (
      error ||
      typeof data !== 'string' ||
      !isValidShortRideId(data)
    ) {
      throw new Error('Could not create shared ride')
    }
    return data
  },

  async get(id: string): Promise<SharedRideLookup> {
    if (!client) return { status: 'unavailable' }
    if (!isValidShortRideId(id)) return { status: 'invalid' }

    let response
    try {
      response = await client.rpc('get_shared_ride', { p_id: id })
    } catch {
      return { status: 'unavailable' }
    }
    const { data, error } = response
    if (error || !Array.isArray(data) || data.length !== 1) {
      return { status: 'unavailable' }
    }

    const row = data[0] as {
      status?: unknown
      payload?: unknown
    }
    if (
      row.status === 'expired' ||
      row.status === 'not_found' ||
      row.status === 'invalid'
    ) {
      return { status: row.status }
    }
    if (row.status !== 'ok') return { status: 'unavailable' }

    const payload = decodeSharedRidePayload(row.payload)
    return payload
      ? { status: 'ok', payload }
      : { status: 'invalid' }
  },
})

export const sharedRideStorage = createSharedRideStorage(supabase)
