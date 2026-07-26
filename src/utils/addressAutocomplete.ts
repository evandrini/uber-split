import type { Language } from '@/i18n/translations'
import type { Stop } from '@/types/ride'

export type AddressFields = {
  road?: string
  house_number?: string
  pedestrian?: string
  suburb?: string
  neighbourhood?: string
  city_district?: string
  quarter?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  state?: string
  country?: string
  country_code?: string
  amenity?: string
  shop?: string
  tourism?: string
}

export type AddressSuggestion = {
  place_id?: number
  display_name: string
  lat: string
  lon: string
  name?: string
  address?: AddressFields
}

export type FormattedSuggestion = {
  primary: string
  secondary: string
  finalValue: string
}

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
const VIEWBOX_DELTA = 0.8
const MAX_RESULTS = 5

const getAcceptLanguage = (language: Language) =>
  language === 'pt-BR' ? 'pt-BR' : language === 'en-US' ? 'en-US' : 'es-ES'

const isFiniteCoordinate = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const getOriginViewbox = (origin?: Stop) => {
  if (!isFiniteCoordinate(origin?.lat) || !isFiniteCoordinate(origin?.lon)) return null

  const left = origin.lon - VIEWBOX_DELTA
  const right = origin.lon + VIEWBOX_DELTA
  const top = origin.lat + VIEWBOX_DELTA
  const bottom = origin.lat - VIEWBOX_DELTA
  return `${left},${top},${right},${bottom}`
}

export const formatAddressSuggestion = (
  item: AddressSuggestion,
): FormattedSuggestion => {
  const address = item.address ?? {}
  const streetBase = address.road || address.pedestrian || item.name || ''
  const street = [streetBase, address.house_number].filter(Boolean).join(', ')
  const district = address.suburb || address.neighbourhood || ''
  const city =
    address.city ||
    address.town ||
    address.municipality ||
    address.village ||
    ''
  const secondary = [district, city, address.state].filter(Boolean).join(', ')

  return {
    primary: street || item.name || city || item.display_name,
    secondary,
    finalValue: item.display_name,
  }
}

const uniqueSuggestions = (items: AddressSuggestion[]) => {
  const unique = new Map<string, AddressSuggestion>()

  for (const item of items) {
    const key =
      item.place_id !== undefined
        ? `place:${item.place_id}`
        : `coords:${item.lat}:${item.lon}`
    if (!unique.has(key)) unique.set(key, item)
    if (unique.size === MAX_RESULTS) break
  }

  return [...unique.values()]
}

const buildSearchUrl = ({
  query,
  language,
  viewbox,
  bounded,
  countryCode,
}: {
  query: string
  language: Language
  viewbox?: string
  bounded?: boolean
  countryCode?: string
}) => {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': getAcceptLanguage(language),
    limit: '10',
    q: query,
  })
  if (viewbox) params.set('viewbox', viewbox)
  if (bounded) params.set('bounded', '1')
  if (countryCode) params.set('countrycodes', countryCode)
  return `${NOMINATIM_SEARCH_URL}?${params.toString()}`
}

export const getOriginCountryCode = (origin?: Stop) => {
  const countryCode = origin?.countryCode?.trim().toLowerCase()
  return countryCode && /^[a-z]{2}$/.test(countryCode) ? countryCode : undefined
}

export const fetchAddressSuggestions = async ({
  query,
  language,
  routeOrigin,
  isOriginField,
  signal,
  fetcher = fetch,
}: {
  query: string
  language: Language
  routeOrigin?: Stop
  isOriginField: boolean
  signal?: AbortSignal
  fetcher?: typeof fetch
}): Promise<AddressSuggestion[]> => {
  if (query.trim().length < 3) return []

  const viewbox = isOriginField ? null : getOriginViewbox(routeOrigin)
  const countryCode = isOriginField ? undefined : getOriginCountryCode(routeOrigin)
  const attempts = viewbox && countryCode
    ? [
        { viewbox, bounded: true, countryCode },
        { viewbox, bounded: false, countryCode },
        { countryCode },
        {},
      ]
    : [{}]

  for (const attempt of attempts) {
    try {
      const response = await fetcher(
        buildSearchUrl({
          query,
          language,
          viewbox: attempt.viewbox,
          bounded: attempt.bounded,
          countryCode: attempt.countryCode,
        }),
        { signal },
      )
      if (!response.ok) continue
      const suggestions = uniqueSuggestions(
        (await response.json()) as AddressSuggestion[],
      )
      if (suggestions.length > 0) return suggestions
    } catch (error) {
      if (signal?.aborted) throw error
    }
  }

  return []
}

export const geocodeBrazilianAddress = async (
  address: string,
  language: Language,
) => {
  if (!address.trim()) return null

  try {
    const results = await fetchAddressSuggestions({
      query: address,
      language,
      isOriginField: true,
    })
    const first = results[0]
    if (!first) return null
    return {
      lat: Number.parseFloat(first.lat),
      lon: Number.parseFloat(first.lon),
      normalizedAddress: first.display_name,
      countryCode: first.address?.country_code?.toLowerCase(),
      country: first.address?.country,
      state: first.address?.state,
      city:
        first.address?.city ||
        first.address?.town ||
        first.address?.municipality ||
        first.address?.village,
    }
  } catch {
    return null
  }
}
