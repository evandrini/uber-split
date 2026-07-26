import type { Stop } from '@/types/ride'

export const getStopLabel = (index: number): string => {
  if (!Number.isInteger(index) || index < 0) return ''

  let value = index + 1
  let label = ''
  while (value > 0) {
    value -= 1
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26)
  }
  return label
}

export const getShortStopAddress = (
  stop: Pick<Stop, 'address' | 'name' | 'city' | 'state' | 'country'>,
) => {
  const fullAddress = (stop.address || stop.name).trim()
  if (!fullAddress) return ''

  const redundantParts = [stop.city, stop.state, stop.country]
    .filter((value): value is string => Boolean(value))
    .map(value => value.trim().toLocaleLowerCase())

  const usefulParts = fullAddress
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .filter(
      part => !redundantParts.includes(part.toLocaleLowerCase()),
    )

  return usefulParts.slice(0, 2).join(', ') || fullAddress
}
