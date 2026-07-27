import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ArrowDown,
  Calculator,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Link,
  MapPin,
  Route,
  Share2,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { DebugPanel } from '@/components/DebugPanel'
import { RouteMapErrorBoundary } from '@/components/RouteMapErrorBoundary'
import { RouteSummaryMap } from '@/components/RouteSummaryMap'
import type { Participant, Settlement, FullRideCalculation, RideCalculation, UberSplitDebugObject } from '@/types/ride'
import { formatCurrency } from '@/utils/rideCalculator'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { APP_URL, useLanguage } from '@/i18n/LanguageContext'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  createSharedRidePayload,
  createSharedRideUrl,
} from '@/utils/sharedRide'
import { buildSharedRideMessage } from '@/utils/shareMessage'
import { getStopLabel as getStopLetter } from '@/utils/stopLabels'
import {
  createShortRideUrl,
  sharedRideStorage,
} from '@/utils/sharedRideStorage'

type SettlementSummaryRow = {
  participantId: string
  participantName: string
  shouldPay: number
  paid: number
  balance: number
}

type TripDetailSection = {
  id: 'outbound' | 'return'
  title: string
  accentClassName: string
  trip: RideCalculation
}
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
  const [isCreatingShare, setIsCreatingShare] = useState(false)
  const [shareAction, setShareAction] = useState<'copy' | 'whatsapp' | null>(null)
  const [showLongLinkFallback, setShowLongLinkFallback] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<'outbound' | 'return'>(
    fullCalculation.outbound ? 'outbound' : 'return',
  )
  const [autoPlayTrip, setAutoPlayTrip] = useState<'outbound' | 'return' | null>(
    fullCalculation.outbound ? 'outbound' : fullCalculation.return ? 'return' : null,
  )
  const transitionTimerRef = useRef<number>()
  const shortLinkCacheRef = useRef<{
    fingerprint: string
    id: string
    url: string
  } | null>(null)
  const shortLinkRequestRef = useRef<{
    fingerprint: string
    request: Promise<string>
  } | null>(null)
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

  const buildPayload = () =>
    createSharedRidePayload(
      fullCalculation,
      participants,
      language,
      includeFullAddresses,
    )

  const buildLongShareLink = () =>
    createSharedRideUrl(APP_URL, buildPayload())

  const updateBrowserShortLink = (id: string) => {
    const browserUrl = new URL(window.location.href)
    browserUrl.searchParams.delete('ride')
    browserUrl.searchParams.set('s', id)
    window.history.replaceState(window.history.state, '', browserUrl.toString())
  }

  const getOrCreateShortLink = async () => {
    const payload = buildPayload()
    const fingerprint = JSON.stringify(payload)
    if (shortLinkCacheRef.current?.fingerprint === fingerprint) {
      updateBrowserShortLink(shortLinkCacheRef.current.id)
      return shortLinkCacheRef.current.url
    }
    if (shortLinkRequestRef.current?.fingerprint === fingerprint) {
      return shortLinkRequestRef.current.request
    }

    setIsCreatingShare(true)
    const request = sharedRideStorage
      .create(payload)
      .then(id => {
        const url = createShortRideUrl(APP_URL, id)
        shortLinkCacheRef.current = { fingerprint, id, url }
        updateBrowserShortLink(id)
        setShowLongLinkFallback(false)
        return url
      })
      .finally(() => {
        if (shortLinkRequestRef.current?.fingerprint === fingerprint) {
          shortLinkRequestRef.current = null
          setIsCreatingShare(false)
        }
      })
    shortLinkRequestRef.current = { fingerprint, request }
    return request
  }

  const handleCopy = async () => {
    setShareAction('copy')
    try {
      let shortUrl: string | undefined
      try {
        shortUrl = await getOrCreateShortLink()
      } catch {
        setShowLongLinkFallback(true)
        toast.warning(t('shortLinkUnavailable') as string)
      }
      await navigator.clipboard.writeText(
        buildSharedRideMessage(settlements, language, shortUrl),
      )
      setCopied(true)
      toast.success(t('messageCopied') as string)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('copyError') as string)
    } finally {
      setShareAction(null)
    }
  }

  const handleShare = async () => {
    setShareAction('whatsapp')
    let shortUrl: string | undefined
    try {
      shortUrl = await getOrCreateShortLink()
    } catch {
      setShowLongLinkFallback(true)
      toast.warning(t('shortLinkUnavailable') as string)
    }
    const message = buildSharedRideMessage(settlements, language, shortUrl)
    const encoded = encodeURIComponent(message)
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    const whatsappUrl = isMobile
      ? `whatsapp://send?text=${encoded}`
      : `https://web.whatsapp.com/send?text=${encoded}`
    window.open(whatsappUrl, isMobile ? '_self' : '_blank', 'noopener,noreferrer')
    setShareAction(null)
  }

  const handleCopyLongLink = async () => {
    try {
      await navigator.clipboard.writeText(buildLongShareLink())
      toast.success(t('longLinkCopied') as string)
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

  const selectedStops = selectedCalculation?.legs.length
    ? [
        selectedCalculation.legs[0].fromStop,
        ...selectedCalculation.legs.map(leg => leg.toStop),
      ]
    : []
  const estimatedMinutes = Math.max(1, Math.round((fullCalculation.totalDistance / 30) * 60))
  const timelineRows = selectedStops.map((stop, index) => {
    const entering = getPassengerNames(stop.entering)
    const exiting = getPassengerNames(stop.exiting)
    const isFirst = index === 0
    const isLast = index === selectedStops.length - 1
    const event = isFirst && entering.length > 0
      ? `${entering.join(', ')} ${t('enteredLabel') as string}`
      : exiting.length > 0
        ? `${exiting.join(', ')} ${t('exitedLabel') as string}`
        : entering.length > 0
          ? `${entering.join(', ')} ${t('enteredLabel') as string}`
          : isLast
            ? (t('finalDestinationTimeline') as string)
            : getStopLabel(stop)
    return { stop, event, isFirst, isLast }
  })

  useEffect(
    () => () => window.clearTimeout(transitionTimerRef.current),
    [],
  )

  const handleAnimationComplete = useCallback(() => {
    if (autoPlayTrip === 'outbound' && fullCalculation.return) {
      window.clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = window.setTimeout(() => {
        setSelectedTrip('return')
        setAutoPlayTrip('return')
      }, 600)
      return
    }
    setAutoPlayTrip(null)
  }, [autoPlayTrip, fullCalculation.return])

  const handleSkipAnimation = useCallback(() => {
    window.clearTimeout(transitionTimerRef.current)
    setAutoPlayTrip(null)
  }, [])

  const handleTripSelection = (trip: 'outbound' | 'return') => {
    window.clearTimeout(transitionTimerRef.current)
    setAutoPlayTrip(null)
    setSelectedTrip(trip)
  }

  return (
    <motion.div layout className="flex animate-fade-in flex-col gap-5 sm:gap-6">
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
        <motion.div layout {...fadeUp()} className="order-1 space-y-3">
          {fullCalculation.outbound && fullCalculation.return && (
            <div className="grid grid-cols-2 rounded-2xl border border-white/70 bg-white/55 p-1 backdrop-blur-xl">
              {(['outbound', 'return'] as const).map(id => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTripSelection(id)}
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
            <RouteMapErrorBoundary
              key={selectedTrip}
              language={language}
              trip={selectedCalculation}
            >
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
                skipLabel={t('skipRoute') as string}
                accumulatedLabel={t('accumulatedParticipation') as string}
                nextLegLabel={t('nextLegCost') as string}
                splitOneLabel={t('splitOnePerson') as string}
                splitManyLabel={t('splitManyPeople') as string}
                distanceTitle={t('distanceByPerson') as string}
                distanceDescription={t('distanceByPersonAnimatedDescription') as string}
                autoPlay={autoPlayTrip === selectedTrip}
                onPlaybackComplete={handleAnimationComplete}
                onSkip={handleSkipAnimation}
              />
            </RouteMapErrorBoundary>
          )}
        </motion.div>
      )}

      <motion.section
        layout
        {...fadeUp()}
        className="order-2 rounded-3xl border border-border/70 bg-card p-5 shadow-[0_14px_38px_hsl(var(--primary)/0.09)] sm:p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Route className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t('receiptLabel') as string}
            </p>
            <h3 className="text-lg font-bold text-foreground">{t('rideSummaryTitle') as string}</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            [Wallet, t('rideTotal') as string, formatCurrency(fullCalculation.totalCost, language)],
            [Users, t('passengerCount') as string, String(participants.length)],
            [MapPin, t('stopCount') as string, String(selectedStops.length)],
            [Route, t('distance') as string, `${fullCalculation.totalDistance.toFixed(1)} km`],
            [Clock3, t('estimatedTime') as string, `~${estimatedMinutes} min`],
          ].map(([Icon, label, value]) => (
            <div key={label as string} className="rounded-2xl bg-muted/45 p-3">
              <Icon className="mb-2 h-4 w-4 text-primary" />
              <p className="text-[11px] text-muted-foreground">{label as string}</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">{value as string}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-3">
          <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold text-foreground">{t('splitMethod') as string}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t('splitMethodDescription') as string}
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section layout {...fadeUp(0.08)} className="order-3 flex gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <h3 className="text-sm font-bold text-foreground">{t('confidenceTitle') as string}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('confidenceText') as string}</p>
        </div>
      </motion.section>

      <motion.section layout {...fadeUp(0.12)} className="order-4 rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-foreground">{t('rideTimelineTitle') as string}</h3>
        <div className="space-y-0">
          {timelineRows.map(({ stop, event, isFirst, isLast }, index) => (
            <div key={`${selectedTrip}-${stop.id}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && <span className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-border" />}
              <span className={`z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background text-xs font-bold ${
                isFirst || isLast ? 'border-primary text-primary' : 'border-border text-muted-foreground'
              }`}>
                {isFirst ? '🚗' : isLast ? '🏁' : getStopLetter(index)}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-foreground">{event}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{stop.address || stop.name}</p>
              </div>
              {!isLast && <ArrowDown className="absolute -bottom-0.5 left-[10px] h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </motion.section>

      <motion.div layout {...fadeUp(0.16)} className="order-5 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 p-4 shadow-sm sm:p-5">
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
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-border/70 bg-card/90 p-4 text-sm shadow-sm"
              >
                <div><p className="font-bold text-foreground">{settlement.fromName}</p><p className="text-[11px] text-muted-foreground">{t('payerLabel') as string}</p></div>
                <div className="text-center"><ArrowDown className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 font-bold text-accent">{formatCurrency(settlement.amount, language)}</p></div>
                <div className="text-right"><p className="font-bold text-foreground">{settlement.toName}</p><p className="text-[11px] text-muted-foreground">{t('receiverLabel') as string}</p></div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noSettlementNeeded') as string}</p>
        )}
      </motion.div>

      <motion.div layout className="order-8" whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}>
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
          className="order-9 space-y-4 overflow-hidden"
        >
          <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <h3 className="text-sm font-bold text-foreground">{t('showMore') as string}</h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
              {(['calculationSimple1', 'calculationSimple2', 'calculationSimple3'] as const).map(key => (
                <li key={key} className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{t(key) as string}</span>
                </li>
              ))}
            </ul>
          </section>
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
                          {getStopLetter(index)} · {getStopLabel(stop)}
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

      <div className="order-6 space-y-2 sm:space-y-3">
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

        <div className="grid gap-2 sm:grid-cols-2">
          <motion.div whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}>
            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={isCreatingShare || shareAction !== null}
              className="h-11 w-full gap-2 rounded-xl px-4 text-sm font-medium btn-pop"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {shareAction === 'copy'
                ? (t('creatingShareLink') as string)
                : copied
                  ? (t('messageCopied') as string)
                  : `📋 ${t('copyMessage') as string}`}
            </Button>
          </motion.div>

          <motion.div whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}>
            <Button
              onClick={handleShare}
              disabled={isCreatingShare || shareAction !== null}
              className="h-11 w-full gap-2 rounded-xl gradient-primary px-4 text-sm font-medium btn-slide"
            >
              <Share2 className="h-4 w-4" />
              {shareAction === 'whatsapp'
                ? (t('openingWhatsApp') as string)
                : `💬 ${t('shareWhatsApp') as string}`}
            </Button>
          </motion.div>
        </div>

        {showLongLinkFallback && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <p className="text-xs text-amber-900">
              {t('longLinkFallbackNotice') as string}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyLongLink}
              className="mt-2 h-8 px-2 text-xs text-amber-900"
            >
              <Link className="mr-1.5 h-3.5 w-3.5" />
              {t('copyLongLink') as string}
            </Button>
          </div>
        )}

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
