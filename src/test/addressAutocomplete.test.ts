import { describe, expect, it, vi } from 'vitest'
import type { Stop } from '@/types/ride'
import {
  fetchAddressSuggestions,
  formatAddressSuggestion,
} from '@/utils/addressAutocomplete'

const origin: Stop = {
  id: 'origin',
  name: 'Belo Horizonte',
  address: 'Belo Horizonte, Minas Gerais, Brasil',
  lat: -19.9167,
  lon: -43.9345,
  countryCode: 'br',
  country: 'Brasil',
  state: 'Minas Gerais',
  city: 'Belo Horizonte',
  entering: [],
  exiting: [],
}

const result = (
  placeId: number,
  city: string,
  state = 'Minas Gerais',
) => ({
  place_id: placeId,
  display_name: `Rua das Flores, ${city}, ${state}, Brasil`,
  lat: '-19.90',
  lon: '-43.90',
  address: {
    road: 'Rua das Flores',
    house_number: '340',
    suburb: 'Centro',
    city,
    state,
    country: 'Brasil',
    country_code: 'br',
  },
})

const response = (items: ReturnType<typeof result>[]) =>
  Promise.resolve({
    ok: true,
    json: async () => items,
  } as Response)

describe('contextual Nominatim autocomplete', () => {
  it('prioritizes a bounded Belo Horizonte search after selecting the origin', async () => {
    const fetcher = vi.fn(() => response([result(1, 'Belo Horizonte')]))
    const suggestions = await fetchAddressSuggestions({
      query: 'Rua das Flores',
      language: 'pt-BR',
      routeOrigin: origin,
      isOriginField: false,
      fetcher,
    })

    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.searchParams.get('countrycodes')).toBe('br')
    expect(url.searchParams.get('bounded')).toBe('1')
    expect(url.searchParams.get('viewbox')).toBeTruthy()
    expect(suggestions[0].address?.city).toBe('Belo Horizonte')
  })

  it('keeps Contagem inside the initial metropolitan-region search', async () => {
    const fetcher = vi.fn(() => response([result(2, 'Contagem')]))
    const suggestions = await fetchAddressSuggestions({
      query: 'Avenida João César',
      language: 'pt-BR',
      routeOrigin: origin,
      isOriginField: false,
      fetcher,
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(suggestions[0].address?.city).toBe('Contagem')
  })

  it('falls back from bounded and preferred viewbox to a national São Paulo search', async () => {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response([result(3, 'São Paulo', 'São Paulo')]))

    const suggestions = await fetchAddressSuggestions({
      query: 'Avenida Paulista',
      language: 'pt-BR',
      routeOrigin: origin,
      isOriginField: false,
      fetcher,
    })

    expect(fetcher).toHaveBeenCalledTimes(3)
    const preferredUrl = new URL(String(fetcher.mock.calls[1][0]))
    const nationalUrl = new URL(String(fetcher.mock.calls[2][0]))
    expect(preferredUrl.searchParams.get('viewbox')).toBeTruthy()
    expect(preferredUrl.searchParams.has('bounded')).toBe(false)
    expect(nationalUrl.searchParams.has('viewbox')).toBe(false)
    expect(nationalUrl.searchParams.get('countrycodes')).toBe('br')
    expect(suggestions[0].address?.city).toBe('São Paulo')
  })

  it('uses a global search when no valid origin exists', async () => {
    const fetcher = vi.fn(() => response([result(4, 'Curitiba', 'Paraná')]))
    await fetchAddressSuggestions({
      query: 'Rua XV de Novembro',
      language: 'pt-BR',
      isOriginField: true,
      fetcher,
    })

    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.searchParams.has('countrycodes')).toBe(false)
    expect(url.searchParams.has('viewbox')).toBe(false)
    expect(url.searchParams.get('format')).toBe('jsonv2')
    expect(url.searchParams.get('addressdetails')).toBe('1')
  })

  it('requests English names when the app language is English', async () => {
    const fetcher = vi.fn(() => response([result(5, 'Belo Horizonte')]))
    await fetchAddressSuggestions({
      query: 'Liberty Square',
      language: 'en-US',
      routeOrigin: origin,
      isOriginField: false,
      fetcher,
    })

    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.searchParams.get('accept-language')).toBe('en-US')
  })

  it('derives countrycodes dynamically from an Irish origin', async () => {
    const irishOrigin: Stop = {
      ...origin,
      name: 'Dublin',
      address: 'Dublin, Ireland',
      lat: 53.3498,
      lon: -6.2603,
      countryCode: 'ie',
      country: 'Ireland',
      city: 'Dublin',
    }
    const fetcher = vi.fn(() =>
      response([{
        ...result(7, 'Dublin', 'Leinster'),
        address: {
          ...result(7, 'Dublin', 'Leinster').address,
          country: 'Ireland',
          country_code: 'ie',
        },
      }]),
    )

    await fetchAddressSuggestions({
      query: 'O Connell Street',
      language: 'en-US',
      routeOrigin: irishOrigin,
      isOriginField: false,
      fetcher,
    })

    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.searchParams.get('countrycodes')).toBe('ie')
  })

  it('reaches a fourth global fallback for international trips', async () => {
    const usOrigin: Stop = {
      ...origin,
      name: 'New York',
      address: 'New York, United States',
      lat: 40.7128,
      lon: -74.006,
      countryCode: 'us',
      country: 'United States',
      state: 'New York',
      city: 'New York',
    }
    const dublinResult = {
      ...result(8, 'Dublin', 'Leinster'),
      address: {
        ...result(8, 'Dublin', 'Leinster').address,
        country: 'Ireland',
        country_code: 'ie',
      },
    }
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response([dublinResult]))

    const suggestions = await fetchAddressSuggestions({
      query: 'Dublin Castle',
      language: 'en-US',
      routeOrigin: usOrigin,
      isOriginField: false,
      fetcher,
    })

    expect(fetcher).toHaveBeenCalledTimes(4)
    const nationalUrl = new URL(String(fetcher.mock.calls[2][0]))
    const globalUrl = new URL(String(fetcher.mock.calls[3][0]))
    expect(nationalUrl.searchParams.get('countrycodes')).toBe('us')
    expect(globalUrl.searchParams.has('countrycodes')).toBe(false)
    expect(suggestions[0].address?.country_code).toBe('ie')
  })

  it('formats compact labels and removes duplicate places', async () => {
    const duplicate = result(6, 'Belo Horizonte')
    const fetcher = vi.fn(() => response([duplicate, duplicate]))
    const suggestions = await fetchAddressSuggestions({
      query: 'Rua das Flores',
      language: 'pt-BR',
      routeOrigin: origin,
      isOriginField: false,
      fetcher,
    })

    expect(suggestions).toHaveLength(1)
    expect(formatAddressSuggestion(suggestions[0])).toEqual({
      primary: 'Rua das Flores, 340',
      secondary: 'Centro, Belo Horizonte, Minas Gerais',
      finalValue: duplicate.display_name,
    })
  })
})
