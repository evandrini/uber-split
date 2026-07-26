import type { Language } from '@/i18n/translations'
import type { Participant, Stop } from '@/types/ride'

export type StopEvents = {
  enteringNames: string[]
  exitingNames: string[]
}

export type NarrativeFrame = {
  position: [number, number]
  stopIndex?: number
}

export const getStopEvents = (
  stop: Stop,
  participants: Participant[],
): StopEvents => ({
  enteringNames: participants
    .filter(person => stop.entering.includes(person.id))
    .map(person => person.name),
  exitingNames: participants
    .filter(person => stop.exiting.includes(person.id))
    .map(person => person.name),
})

const joinNames = (names: string[], language: Language) => {
  if (names.length <= 1) return names[0] ?? ''
  const conjunction = language === 'pt-BR' ? ' e ' : language === 'es-ES' ? ' y ' : ' and '
  return `${names.slice(0, -1).join(', ')}${conjunction}${names.at(-1)}`
}

export const formatStopEvent = (
  stop: Stop,
  stopIndex: number,
  stopCount: number,
  participants: Participant[],
  language: Language,
) => {
  const { enteringNames, exitingNames } = getStopEvents(stop, participants)
  const isFinalStop = stopIndex === stopCount - 1

  if (
    isFinalStop &&
    exitingNames.length > 0 &&
    exitingNames.length === participants.length
  ) {
    if (language === 'pt-BR') return 'Todos saíram no destino'
    if (language === 'es-ES') return 'Todos bajaron en el destino'
    return 'Everyone exited at the destination'
  }

  const messages: string[] = []
  if (enteringNames.length > 0) {
    const verb =
      language === 'pt-BR'
        ? enteringNames.length === 1 ? 'entrou' : 'entraram'
        : language === 'es-ES'
          ? enteringNames.length === 1 ? 'subió' : 'subieron'
          : enteringNames.length === 1 ? 'entered' : 'entered'
    messages.push(`${joinNames(enteringNames, language)} ${verb}`)
  }
  if (exitingNames.length > 0) {
    const verb =
      language === 'pt-BR'
        ? exitingNames.length === 1 ? 'saiu' : 'saíram'
        : language === 'es-ES'
          ? exitingNames.length === 1 ? 'bajó' : 'bajaron'
          : exitingNames.length === 1 ? 'exited' : 'exited'
    messages.push(`${joinNames(exitingNames, language)} ${verb}`)
  }
  return messages.join(' · ')
}

const distanceSquared = (
  first: [number, number],
  second: [number, number],
) => {
  const lat = first[0] - second[0]
  const lon = first[1] - second[1]
  return lat * lat + lon * lon
}

export const findStopGeometryIndices = (
  geometry: [number, number][],
  stops: Stop[],
) => {
  let minimumIndex = 0
  return stops.map(stop => {
    const target: [number, number] = [stop.lat as number, stop.lon as number]
    let nearestIndex = minimumIndex
    let nearestDistance = Number.POSITIVE_INFINITY

    for (let index = minimumIndex; index < geometry.length; index += 1) {
      const distance = distanceSquared(geometry[index], target)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    }
    minimumIndex = nearestIndex
    return nearestIndex
  })
}

export const buildNarrativeFrames = (
  geometry: [number, number][],
  stops: Stop[],
  reducedMotion = false,
): NarrativeFrame[] => {
  if (geometry.length < 2 || stops.length < 2) return []
  const waypointIndices = findStopGeometryIndices(geometry, stops)
  const frames: NarrativeFrame[] = []
  const pauseFrames = reducedMotion ? 6 : 7

  stops.forEach((_, stopIndex) => {
    if (stopIndex > 0 && !reducedMotion) {
      const start = waypointIndices[stopIndex - 1]
      const end = waypointIndices[stopIndex]
      const segmentLength = Math.max(end - start, 1)
      const movementFrames = Math.max(8, Math.round(45 / (stops.length - 1)))

      for (let frame = 1; frame <= movementFrames; frame += 1) {
        const coordinateIndex = Math.min(
          end,
          start + Math.round((segmentLength * frame) / movementFrames),
        )
        frames.push({ position: geometry[coordinateIndex] })
      }
    }

    for (let pause = 0; pause < pauseFrames; pause += 1) {
      frames.push({
        position: geometry[waypointIndices[stopIndex]],
        stopIndex,
      })
    }
  })

  return frames
}
