import { Component, type ErrorInfo, type ReactNode } from 'react'
import type { Language } from '@/i18n/translations'
import type { RideCalculation } from '@/types/ride'
import { getStopLabel } from '@/utils/stopLabels'

interface RouteMapErrorBoundaryProps {
  children: ReactNode
  language: Language
  trip: RideCalculation
}

interface RouteMapErrorBoundaryState {
  hasError: boolean
}

export class RouteMapErrorBoundary extends Component<
  RouteMapErrorBoundaryProps,
  RouteMapErrorBoundaryState
> {
  state: RouteMapErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): RouteMapErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('RouteSummaryMap render failed', error, info)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { language, trip } = this.props
    const stops =
      trip.legs.length > 0
        ? [trip.legs[0].fromStop, ...trip.legs.map(leg => leg.toStop)]
        : []
    const message =
      language === 'pt-BR'
        ? 'Não foi possível carregar o mapa. Os valores da conta continuam disponíveis abaixo.'
        : 'The map could not be loaded. The calculation results are still available below.'

    return (
      <section
        role="alert"
        className="glass-panel rounded-3xl p-3 sm:p-4"
      >
        <p className="text-sm text-muted-foreground">{message}</p>
        {stops.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {stops.map((stop, index) => (
              <div key={stop.id} className="flex min-w-0 items-center gap-2">
                {index > 0 && (
                  <span className="text-xs text-muted-foreground" aria-hidden="true">
                    →
                  </span>
                )}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
                  {getStopLabel(index)}
                </span>
                <span className="max-w-32 truncate text-xs font-medium text-foreground">
                  {stop.name || stop.address || getStopLabel(index)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    )
  }
}
