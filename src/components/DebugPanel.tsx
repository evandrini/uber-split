import type { UberSplitDebugObject, TripDebugCalculation } from '@/types/ride'
import { formatCurrency } from '@/utils/rideCalculator'
import { useLanguage } from '@/i18n/LanguageContext'
import { Bug, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface DebugPanelProps {
  debug?: UberSplitDebugObject
}

const formatList = (values: string[]) => (values.length > 0 ? values.join(', ') : '-')

function TripDebugSection({
  title,
  trip,
}: {
  title: string
  trip?: TripDebugCalculation
}) {
  const { language } = useLanguage()

  if (!trip) return null

  return (
    <section className="space-y-3 rounded-2xl border border-dashed border-border bg-muted/30 p-3">
      <div>
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">
          {trip.totalDistance.toFixed(2)} km | {formatCurrency(trip.totalCost, language)}
        </p>
      </div>

      <div className="space-y-2">
        {trip.legs.map(leg => (
          <div key={`${title}-${leg.index}`} className="rounded-xl border border-border/70 bg-background/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-foreground">LEG {leg.index}</span>
              <span className="text-muted-foreground">{leg.distance.toFixed(2)} km</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>
                {leg.from} {'->'} {leg.to}
              </div>
              <div>Passengers: {formatList(leg.passengers)}</div>
              <div>Cost: {formatCurrency(leg.cost, language)}</div>
              <div className="pt-1 text-foreground">
                {leg.costSplit.length > 0
                  ? leg.costSplit.map(split => (
                      <div key={`${title}-${leg.index}-${split.participantId}`}>
                        {split.participantName}: {formatCurrency(split.amount, language)}
                      </div>
                    ))
                  : '-'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1 rounded-xl border border-border/70 bg-background/80 p-3 text-xs">
        <div className="font-semibold text-foreground">Trip totals</div>
        {trip.totals.map(total => (
          <div key={`${title}-total-${total.participantId}`} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{total.participantName}</span>
            <span className="font-medium text-foreground">
              {formatCurrency(total.totalCost, language)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function DebugPanel({ debug }: DebugPanelProps) {
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  if (!import.meta.env.DEV || !debug) return null

  return (
    <aside className="text-left">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="ml-auto flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/80 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm transition hover:bg-muted"
        aria-expanded={isOpen}
      >
        <Bug className="h-3.5 w-3.5" />
        Debug
        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {!isOpen && null}

      {isOpen && (
        <div className="mt-3 space-y-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Debug Panel</h3>
            <p className="text-xs text-muted-foreground">Development-only ride calculation trace.</p>
          </div>

          <TripDebugSection title="Outbound" trip={debug.outbound} />
          <TripDebugSection title="Return" trip={debug.return} />

          <section className="space-y-1 rounded-2xl border border-dashed border-border bg-background/80 p-3 text-xs">
            <h4 className="font-bold text-foreground">Final totals</h4>
            {debug.totals.map(total => (
              <div key={`combined-total-${total.participantId}`} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{total.participantName}</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(total.totalCost, language)}
                </span>
              </div>
            ))}
          </section>

          <section className="space-y-1 rounded-2xl border border-dashed border-border bg-background/80 p-3 text-xs">
            <h4 className="font-bold text-foreground">Settlements</h4>
            {debug.settlements.length > 0 ? (
              debug.settlements.map((settlement, index) => (
                <div
                  key={`debug-settlement-${settlement.fromId}-${settlement.toId}-${index}`}
                  className="flex justify-between gap-3"
                >
                  <span className="text-muted-foreground">
                    {settlement.fromName} {'->'} {settlement.toName}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(settlement.amount, language)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">-</div>
            )}
          </section>

          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-background/90 p-3 text-[11px] leading-relaxed text-foreground">
            {debug.log}
          </pre>
        </div>
      )}
    </aside>
  )
}
