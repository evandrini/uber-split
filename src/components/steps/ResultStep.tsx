import { Button } from '@/components/ui/button'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  Copy,
  MapPin,
  Link,
  Route,
  Share2,
  Users,
  Wallet,
} from 'lucide-react'
import { DebugPanel } from '@/components/DebugPanel'
import type { Participant, Settlement, FullRideCalculation, RideCalculation, UberSplitDebugObject } from '@/types/ride'
import { formatCurrency, generateWhatsAppText } from '@/utils/rideCalculator'
import { lazy, Suspense, useState } from 'react'
import { toast } from 'sonner'
import { APP_URL, useLanguage } from '@/i18n/LanguageContext'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  createSharedRidePayload,
  createSharedRideUrl,
} from '@/utils/sharedRide'

type SettlementSummaryRow = {
  participantId: string
  participantName: string
  shouldPay: number
  paid: number
  balance: number
}

type RideIntensityRow = {
  participantId: string
  participantName: string
  distance: number
  percent: number
}

type TripDetailSection = {
  id: 'outbound' | 'return'
  title: string
  accentClassName: string
  trip: RideCalculation
}

const RouteSummaryMap = lazy(() =>
  import('@/components/RouteSummaryMap').then(module => ({
    default: module.RouteSummaryMap,
  })),
)

interface ResultStepProps {
  fullCalculation: FullRideCalculation
  participants: Participant[]
  settlements: Settlement[]
  onBack: () => void
  onReset: () => void
}

export function ResultStep({
  fullCalculation,
  participants,
  settlements,
  onBack,
  onReset,
}: ResultStepProps) {
  const [copied, setCopied] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [includeFullAddresses, setIncludeFullAddresses] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<'outbound' | 'return'>(
    fullCalculation.outbound ? 'outbound' : 'return',
  )
  const { t, language } = useLanguage()
  const shouldReduceMotion = useReducedMotion()

  const springTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 260, damping: 28, mass: 0.7 }

  const fadeUp = (delay = 0) => ({
    initial: shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { ...springTransition, delay },
  })

  const buildShareLink = () =>
    createSharedRideUrl(
      APP_URL,
      createSharedRidePayload(
        fullCalculation,
        participants,
        language,
        includeFullAddresses,
      ),
    )

  const buildShareMessage = () => {
    const transferText = settlements.length > 0
      ? settlements
          .map(settlement =>
            `${settlement.fromName} ${t('mustPay') as string} ${formatCurrency(settlement.amount, language)} ${t('to') as string} ${settlement.toName}.`
          )
          .join('\n')
      : t('noSettlementNeeded') as string

    try {
      return [
        'UberSplit',
        '',
        `${t('total') as string}: ${formatCurrency(fullCalculation.totalCost, language)}`,
        transferText,
        '',
        t('fullCalculationLink') as string,
        buildShareLink(),
      ].join('\n')
    } catch {
      toast.error(t('linkUnavailable') as string)
      return generateWhatsAppText(fullCalculation, settlements, language)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareMessage())
      setCopied(true)
      toast.success(t('copySuccess') as string)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('copyError') as string)
    }
  }

  const handleShare = () => {
    const message = buildShareMessage()
    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildShareLink())
      toast.success(t('linkCopied') as string)
    } catch {
      toast.error(t('linkUnavailable') as string)
    }
  }

  const sortedCosts = [...fullCalculation.combinedCosts]
    .filter(cost => cost.totalCost > 0)
    .sort((a, b) => b.totalCost - a.totalCost)

  const debugObject: UberSplitDebugObject | undefined = fullCalculation.debug
    ? {
        ...fullCalculation.debug,
        settlements,
      }
    : undefined

  const outboundPayer = fullCalculation.outbound?.paidById
    ? participants.find(participant => participant.id === fullCalculation.outbound?.paidById)
    : null

  const returnPayer = fullCalculation.return?.paidById
    ? participants.find(participant => participant.id === fullCalculation.return?.paidById)
    : null

  const hasAnyPayer = Boolean(fullCalculation.outbound?.paidById || fullCalculation.return?.paidById)

  const summaryMap = new Map<string, SettlementSummaryRow>()

  participants.forEach(participant => {
    summaryMap.set(participant.id, {
      participantId: participant.id,
      participantName: participant.name,
      shouldPay: 0,
      paid: 0,
      balance: 0,
    })
  })

  fullCalculation.combinedCosts.forEach(cost => {
    const row = summaryMap.get(cost.participantId)
    if (!row) return
    row.shouldPay = cost.totalCost
  })

  if (fullCalculation.outbound?.paidById) {
    const row = summaryMap.get(fullCalculation.outbound.paidById)
    if (row) row.paid += fullCalculation.outbound.totalCost
  }

  if (fullCalculation.return?.paidById) {
    const row = summaryMap.get(fullCalculation.return.paidById)
    if (row) row.paid += fullCalculation.return.totalCost
  }

  const settlementSummary = Array.from(summaryMap.values())
    .map(row => ({
      ...row,
      balance: row.paid - row.shouldPay,
    }))
    .sort((a, b) => b.shouldPay - a.shouldPay)

  const rideDistanceMap = new Map<string, number>()
  participants.forEach(participant => rideDistanceMap.set(participant.id, 0))

  const allLegs = [
    ...(fullCalculation.outbound?.legs ?? []),
    ...(fullCalculation.return?.legs ?? []),
  ]

  allLegs.forEach(leg => {
    leg.passengers.forEach(passengerId => {
      rideDistanceMap.set(
        passengerId,
        (rideDistanceMap.get(passengerId) ?? 0) + leg.distance
      )
    })
  })

  const maxDistance = Math.max(...Array.from(rideDistanceMap.values()), 0)

  const rideIntensity: RideIntensityRow[] = participants
    .map(participant => {
      const distance = rideDistanceMap.get(participant.id) ?? 0
      return {
        participantId: participant.id,
        participantName: participant.name,
        distance,
        percent: maxDistance > 0 ? (distance / maxDistance) * 100 : 0,
      }
    })
    .sort((a, b) => b.distance - a.distance)

  const tripDetailSections: TripDetailSection[] = [
    fullCalculation.outbound && fullCalculation.outbound.totalCost > 0
      ? {
          id: 'outbound' as const,
          title: t('outbound') as string,
          accentClassName: 'bg-primary text-primary-foreground',
          trip: fullCalculation.outbound,
        }
      : null,
    fullCalculation.return && fullCalculation.return.totalCost > 0
      ? {
          id: 'return' as const,
          title: t('return') as string,
          accentClassName: 'bg-accent text-accent-foreground',
          trip: fullCalculation.return,
        }
      : null,
  ].filter((section): section is TripDetailSection => Boolean(section))

  const getPassengerNames = (passengerIds: string[]) =>
    passengerIds
      .map(passengerId => participants.find(participant => participant.id === passengerId)?.name)
      .filter((name): name is string => Boolean(name))

  const getStopLabel = (stop: { name?: string; address?: string }) =>
    stop.name || stop.address || '-'

  const selectedCalculation =
    selectedTrip === 'outbound'
      ? fullCalculation.outbound
      : fullCalculation.return

  return (
    <motion.div layout className="animate-fade-in space-y-5 sm:space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary sm:mb-4 sm:h-16 sm:w-16 sm:rounded-2xl">
          <Check className="h-6 w-6 text-primary-foreground sm:h-8 sm:w-8" />
        </div>
        <h2 className="mb-1 text-xl font-bold text-foreground sm:mb-2 sm:text-2xl">
          {t('resultTitle') as string}
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          {t('resultSubtitle') as string}
        </p>
      </div>

      {(fullCalculation.outbound || fullCalculation.return) && (
        <motion.div layout {...fadeUp()} className="space-y-3">
          {fullCalculation.outbound && fullCalculation.return && (
            <div className="grid grid-cols-2 rounded-2xl border border-white/70 bg-white/55 p-1 backdrop-blur-xl">
              {(['outbound', 'return'] as const).map(id => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedTrip(id)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    selectedTrip === id
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-white/70'
                  }`}
                >
                  {t(id === 'outbound' ? 'outbound' : 'return') as string}
                </button>
              ))}
            </div>
          )}
          {selectedCalculation && (
            <Suspense fallback={<div className="h-56 animate-pulse rounded-3xl bg-muted/70" />}>
              <RouteSummaryMap
                trip={selectedCalculation}
                participants={participants}
                tripKey={selectedTrip}
                fallbackLabel={t('mapFallback') as string}
                loadingLabel={t('mapLoading') as string}
                originLabel={t('origin') as string}
                intermediateLabel={t('intermediateStop') as string}
                destinationLabel={t('finalDestination') as string}
                enteredLabel={t('enteredLabel') as string}
                exitedLabel={t('exitedLabel') as string}
                language={language}
                playLabel={t('playRoute') as string}
                pauseLabel={t('pauseRoute') as string}
                replayLabel={t('replayRoute') as string}
              />
            </Suspense>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <motion.div layout {...fadeUp()} className="rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <CircleDollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">{t('total') as string}</span>
          </div>
          <p className="text-base font-bold text-foreground sm:text-xl">
            {formatCurrency(fullCalculation.totalCost, language)}
          </p>
        </motion.div>

        <motion.div layout {...fadeUp(0.04)} className="rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-medium">{t('distance') as string}</span>
          </div>
          <p className="text-base font-bold text-foreground sm:text-xl">
            {fullCalculation.totalDistance.toFixed(1)} km
          </p>
        </motion.div>
      </div>

      <div className="space-y-2">
        {fullCalculation.outbound && fullCalculation.outbound.totalCost > 0 && (
          <motion.div layout {...fadeUp(0.08)} className="rounded-xl border border-primary/15 bg-primary/5 p-3 sm:p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ArrowUpRight className="h-4 w-4 text-primary" />
                {t('outbound') as string}
              </div>
              <span className="font-bold text-foreground">
                {formatCurrency(fullCalculation.outbound.totalCost, language)}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {outboundPayer
                ? `${t('whoPaid') as string}: ${outboundPayer.name}`
                : `${t('whoPaid') as string}: -`}
            </div>
          </motion.div>
        )}

        {fullCalculation.return && fullCalculation.return.totalCost > 0 && (
          <motion.div layout {...fadeUp(0.12)} className="rounded-xl border border-accent/20 bg-accent/5 p-3 sm:p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ArrowDownLeft className="h-4 w-4 text-accent" />
                {t('return') as string}
              </div>
              <span className="font-bold text-foreground">
                {formatCurrency(fullCalculation.return.totalCost, language)}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {returnPayer
                ? `${t('whoPaid') as string}: ${returnPayer.name}`
                : `${t('whoPaid') as string}: -`}
            </div>
          </motion.div>
        )}
      </div>

      <motion.div layout {...fadeUp(0.16)} className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-bold text-foreground sm:text-base">
          {t('settlementExplainTitle') as string}
        </h3>

        {!hasAnyPayer ? (
          <p className="text-sm text-muted-foreground">
            {t('missingPayerForSettlement') as string}
          </p>
        ) : settlements.length > 0 ? (
          <div className="space-y-2">
            {settlements.map((settlement, index) => (
              <motion.div
                layout
                key={`${settlement.fromId}-${settlement.toId}-${index}`}
                {...fadeUp(index * 0.035)}
                className="flex items-center justify-between rounded-lg border border-border/70 bg-card/85 p-3 text-sm"
              >
                <span className="text-foreground">
                  <strong>{settlement.fromName}</strong> {t('mustPay') as string}{' '}
                  <strong>{settlement.toName}</strong>
                </span>
                <span className="font-bold text-accent">
                  {formatCurrency(settlement.amount, language)}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noSettlementNeeded') as string}</p>
        )}
      </motion.div>

      <motion.div data-testid="distance-chart" layout {...fadeUp(0.18)} className="rounded-2xl border border-border/80 bg-card/85 p-4 backdrop-blur-sm sm:p-5">
        <h3 className="mb-1 text-sm font-bold text-foreground sm:text-base">
          {t('distanceByPerson') as string}
        </h3>
        <p className="mb-3 text-xs text-muted-foreground sm:text-sm">
          {t('distanceByPersonDescription') as string}
        </p>
        <div className="space-y-2.5">
          {rideIntensity.map(row => (
            <motion.div layout key={row.participantId} className="space-y-1">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-medium text-foreground">{row.participantName}</span>
                <span className="text-muted-foreground">{row.distance.toFixed(1)} km</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted">
                <motion.div
                  className="h-2.5 rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={shouldReduceMotion ? false : { width: 0 }}
                  animate={{ width: `${Math.max(row.percent, row.distance > 0 ? 8 : 0)}%` }}
                  transition={springTransition}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div layout whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}>
        <Button
          variant="outline"
          onClick={() => setShowDetails(prev => !prev)}
          className="h-10 w-full sm:h-11 btn-pop"
          aria-expanded={showDetails}
        >
          {showDetails ? (t('showLess') as string) : (t('showMore') as string)}
          <motion.span
            animate={{ rotate: showDetails ? 180 : 0 }}
            transition={springTransition}
            className="ml-1 inline-flex"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </Button>
      </motion.div>

      <AnimatePresence initial={false}>
        {showDetails && (
        <motion.div
          key="calculation-details"
          data-testid="calculation-details"
          layout
          initial={shouldReduceMotion ? false : { opacity: 0, y: -8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }}
          transition={springTransition}
          className="space-y-4 overflow-hidden"
        >
          <div className="space-y-3">
            {tripDetailSections.map(section => {
              return (
                <motion.section
                  layout
                  key={section.id}
                  className="rounded-2xl border border-border/80 bg-card/85 p-4 backdrop-blur-sm sm:p-5"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${section.accentClassName}`}>
                        <Route className="h-4 w-4" />
                      </span>
                      <h3 className="text-sm font-bold text-foreground sm:text-base">
                        {section.title}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {section.trip.legs.length}{' '}
                      {section.trip.legs.length === 1
                        ? (t('legs') as string)
                        : (t('legsPlural') as string)}
                    </span>
                  </div>

                  <div className="mb-4 space-y-2">
                    {[
                      section.trip.legs[0]?.fromStop,
                      ...section.trip.legs.map(leg => leg.toStop),
                    ].filter(Boolean).map((stop, index) => (
                      <div
                        key={`${section.id}-point-${stop.id}`}
                        className="rounded-xl border border-border/60 bg-background/70 p-3"
                      >
                        <p className="text-xs font-bold text-teal-800">
                          {String.fromCharCode(65 + index)} · {getStopLabel(stop)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {stop.address || stop.name || '-'}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {section.trip.legs.map((leg, index) => {
                      const breakdown = section.trip.legBreakdown[index]
                      const passengerNames = breakdown?.passengerNames ?? getPassengerNames(leg.passengers)
                      const legTotalCost = breakdown?.totalLegCost ?? 0
                      const passengerCost = breakdown?.costPerPassenger ?? 0

                      return (
                        <motion.article
                          layout
                          key={`${section.id}-${leg.fromStop.id}-${leg.toStop.id}-${index}`}
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 10, scale: 0.99 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ ...springTransition, delay: index * 0.04 }}
                          className="relative rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm"
                        >
                          <div className="absolute bottom-3 left-6 top-12 w-px bg-border" aria-hidden="true" />
                          <div className="relative flex gap-3">
                            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${section.accentClassName}`}>
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {getStopLabel(leg.fromStop)} {'->'} {getStopLabel(leg.toStop)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {leg.distance.toFixed(1)} km
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg bg-muted/55 p-2">
                                  <div className="text-muted-foreground">
                                    {t('total') as string}
                                  </div>
                                  <div className="font-semibold text-foreground">
                                    {formatCurrency(legTotalCost, language)}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-muted/55 p-2">
                                  <div className="text-muted-foreground">
                                    {t('perPerson') as string}
                                  </div>
                                  <div className="font-semibold text-foreground">
                                    {formatCurrency(passengerCost, language)}
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-lg border border-border/60 bg-card/80 p-2">
                                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                  <Users className="h-3.5 w-3.5" />
                                  {leg.passengers.length}
                                </div>
                                <p className="text-xs font-medium text-foreground">
                                  {passengerNames.length > 0 ? passengerNames.join(', ') : '-'}
                                </p>
                                {passengerNames.map(name => (
                                  <p key={name} className="mt-1 text-[11px] text-teal-800">
                                    {name} {t('paysLabel') as string}{' '}
                                    {formatCurrency(passengerCost, language)}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.article>
                      )
                    })}
                  </div>
                </motion.section>
              )
            })}
          </div>

          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-sm">
              {t('perPerson') as string}
            </h3>

            {sortedCosts.map((cost, index) => {
              const topLegs = cost.legDetails.slice(0, 3)

              return (
                <motion.article
                  layout
                  key={cost.participantId}
                  {...fadeUp(index * 0.04)}
                  className="rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground sm:text-base">
                        {cost.participantName}
                      </p>
                      <p className="text-[11px] text-muted-foreground sm:text-xs">
                        {cost.legDetails.length}{' '}
                        {cost.legDetails.length === 1
                          ? (t('legs') as string)
                          : (t('legsPlural') as string)}
                      </p>
                    </div>
                    <p className="text-base font-bold text-accent sm:text-xl">
                      {formatCurrency(cost.totalCost, language)}
                    </p>
                  </div>

                  {topLegs.length > 0 && (
                    <div className="space-y-1.5 rounded-lg bg-muted/50 p-2.5 sm:p-3">
                      {topLegs.map((leg, legIndex) => (
                        <div key={`${cost.participantId}-${legIndex}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-muted-foreground">
                            {leg.from} {'->'} {leg.to}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(leg.cost, language)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.article>
              )
            })}
          </div>

          <motion.div layout className="rounded-2xl border border-border/80 bg-card/85 p-4 backdrop-blur-sm sm:p-5">
            <h3 className="mb-3 text-sm font-bold text-foreground sm:text-base">
              {t('settlementSummaryTitle') as string}
            </h3>

            <div className="space-y-2">
              {settlementSummary.map(row => (
                <motion.div
                  layout
                  key={row.participantId}
                  {...fadeUp()}
                  className="rounded-xl border border-border/70 bg-background/80 p-3"
                >
                  <div className="mb-2 text-sm font-semibold text-foreground">
                    {row.participantName}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
                    <div>
                      <div className="text-muted-foreground">{t('shouldPayLabel') as string}</div>
                      <div className="font-medium text-foreground">
                        {formatCurrency(row.shouldPay, language)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{t('paidLabel') as string}</div>
                      <div className="font-medium text-foreground">
                        {formatCurrency(row.paid, language)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{t('balanceLabel') as string}</div>
                      <div className="font-medium text-foreground">
                        {Math.abs(row.balance) < 0.01
                          ? `${t('balanceZero') as string} (${formatCurrency(0, language)})`
                          : row.balance > 0
                            ? `${t('balancePositive') as string} ${formatCurrency(row.balance, language)}`
                            : `${t('balanceNegative') as string} ${formatCurrency(Math.abs(row.balance), language)}`}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <DebugPanel debug={debugObject} />

      <div className="space-y-2 sm:space-y-3">
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-3">
          <p className="text-xs text-amber-900">{t('sharePrivacyNotice') as string}</p>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-white/70 p-1">
            <button
              type="button"
              onClick={() => setIncludeFullAddresses(true)}
              className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                includeFullAddresses ? 'bg-teal-700 text-white' : 'text-muted-foreground'
              }`}
            >
              {t('shareFullAddresses') as string}
            </button>
            <button
              type="button"
              onClick={() => setIncludeFullAddresses(false)}
              className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                !includeFullAddresses ? 'bg-teal-700 text-white' : 'text-muted-foreground'
              }`}
            >
              {t('hideAddressDetails') as string}
            </button>
          </div>
        </div>

        <motion.div whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}>
          <Button
            onClick={handleShare}
            className="h-11 w-full gradient-primary text-sm sm:h-12 sm:text-base btn-slide"
          >
            <Share2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            {t('shareWhatsApp') as string}
          </Button>
        </motion.div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <motion.div whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-10 w-full gap-2 rounded-xl px-4 text-sm font-medium sm:w-auto btn-pop"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? (t('copied') as string) : (t('copyMessage') as string)}
            </Button>
          </motion.div>

          <motion.div whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-10 w-full gap-2 rounded-xl border-white/70 bg-white/55 px-4 text-sm font-medium shadow-sm backdrop-blur sm:w-auto btn-pop"
            >
              <Link className="h-4 w-4" />
              {t('copyRideLink') as string}
            </Button>
          </motion.div>
        </div>

        <div className="flex gap-2 sm:gap-3">
          <motion.div className="flex-1" whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}>
            <Button
              variant="outline"
              onClick={onBack}
              className="h-10 w-full text-sm sm:h-12 sm:text-base btn-pop"
            >
              <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('edit') as string}
            </Button>
          </motion.div>

          <motion.div className="flex-1" whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}>
            <Button
              variant="outline"
              onClick={onReset}
              className="h-10 w-full text-sm sm:h-12 sm:text-base btn-pop"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {t('newRide') as string}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

