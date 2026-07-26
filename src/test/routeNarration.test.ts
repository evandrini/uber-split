import { describe, expect, it } from 'vitest'
import type { Participant, Stop } from '@/types/ride'
import {
  buildNarrativeFrames,
  formatStopEvent,
  getStopEvents,
} from '@/utils/routeNarration'

const participants: Participant[] = [
  { id: 'bruno', name: 'Bruno' },
  { id: 'evandro', name: 'Evandro' },
]
const stops: Stop[] = [
  { id: 'a', name: 'A', address: 'A', lat: 0, lon: 0, entering: ['bruno'], exiting: [] },
  { id: 'b', name: 'B', address: 'B', lat: 0, lon: 1, entering: ['evandro'], exiting: [] },
  { id: 'c', name: 'C', address: 'C', lat: 0, lon: 2, entering: [], exiting: ['bruno', 'evandro'] },
]
const geometry: [number, number][] = [
  [0, 0],
  [0, 0.5],
  [0, 1],
  [0, 1.5],
  [0, 2],
]

describe('route narration', () => {
  it('pauses at every stop in the correct order', () => {
    const frames = buildNarrativeFrames(geometry, stops)
    const visitedStops = frames
      .map(frame => frame.stopIndex)
      .filter((index, position, values) =>
        index !== undefined && index !== values[position - 1]
      )

    expect(visitedStops).toEqual([0, 1, 2])
  })

  it('derives entering and exiting events from the correct stop', () => {
    expect(getStopEvents(stops[1], participants)).toEqual({
      enteringNames: ['Evandro'],
      exitingNames: [],
    })
    expect(formatStopEvent(stops[0], 0, stops.length, participants, 'pt-BR'))
      .toBe('Bruno entrou')
    expect(formatStopEvent(stops[1], 1, stops.length, participants, 'en-US'))
      .toBe('Evandro entered')
    expect(formatStopEvent(stops[2], 2, stops.length, participants, 'pt-BR'))
      .toBe('Todos saíram no destino')
  })

  it('uses stop highlights without intermediate car movement for reduced motion', () => {
    const frames = buildNarrativeFrames(geometry, stops, true)
    const uniquePositions = new Set(frames.map(frame => frame.position.join(',')))

    expect(uniquePositions).toEqual(new Set(['0,0', '0,1', '0,2']))
    expect(frames.every(frame => frame.stopIndex !== undefined)).toBe(true)
  })
})
