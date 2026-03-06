import { Button } from '@/components/ui/button'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Copy,
  MapPin,
  Share2,
  Wallet,
} from 'lucide-react'
import type { Participant, Settlement, FullRideCalculation } from '@/types/ride'
import { formatCurrency, generateWhatsAppText } from '@/utils/rideCalculator'
import { useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/i18n/LanguageContext'

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
  const { t, language } = useLanguage()

  const buildShareMessage = () => {
    const baseText = generateWhatsAppText(fullCalculation, settlements, language)
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''

    const promoText =
      language === 'pt-BR'
        ? '\n\nFaça sua própria divisão aqui:\n'
        : language === 'es-ES'
          ? '\n\nHaz tu propia división aquí:\n'
          : '\n\nSplit your ride here:\n'

    return baseText + promoText + siteUrl
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

  const sortedCosts = [...fullCalculation.combinedCosts]
    .filter(cost => cost.totalCost > 0)
    .sort((a, b) => b.totalCost - a.totalCost)

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

  const settlementTitle = t('settlementExplainTitle') as string

  return (
    <div className="animate-fade-in space-y-5 sm:space-y-6">
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

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <CircleDollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">{t('total') as string}</span>
          </div>
          <p className="text-base font-bold text-foreground sm:text-xl">
            {formatCurrency(fullCalculation.totalCost, language)}
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-medium">{t('distance') as string}</span>
          </div>
          <p className="text-base font-bold text-foreground sm:text-xl">
            {fullCalculation.totalDistance.toFixed(1)} km
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {fullCalculation.outbound && fullCalculation.outbound.totalCost > 0 && (
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 sm:p-4">
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
          </div>
        )}

        {fullCalculation.return && fullCalculation.return.totalCost > 0 && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 sm:p-4">
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
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/85 p-4 backdrop-blur-sm sm:p-5">
        <h3 className="mb-1 text-sm font-bold text-foreground sm:text-base">
          {t('rideIntensityTitle') as string}
        </h3>
        <p className="mb-3 text-xs text-muted-foreground sm:text-sm">
          {t('rideIntensitySubtitle') as string}
        </p>

        <div className="space-y-2.5">
          {rideIntensity.map(row => (
            <div key={row.participantId} className="space-y-1">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-medium text-foreground">{row.participantName}</span>
                <span className="text-muted-foreground">{row.distance.toFixed(1)} km</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{ width: `${Math.max(row.percent, row.distance > 0 ? 8 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-sm">
          {t('perPerson') as string}
        </h3>

        {sortedCosts.map((cost, index) => {
          const topLegs = cost.legDetails.slice(0, 3)

          return (
            <article
              key={cost.participantId}
              className="animate-slide-in rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4"
              style={{ animationDelay: `${index * 90}ms` }}
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
            </article>
          )
        })}
      </div>

      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-bold text-foreground sm:text-base">
          {settlementTitle}
        </h3>

        {!hasAnyPayer ? (
          <p className="text-sm text-muted-foreground">
            {t('missingPayerForSettlement') as string}
          </p>
        ) : settlements.length > 0 ? (
          <div className="space-y-2">
            {settlements.map((settlement, index) => (
              <div
                key={`${settlement.fromId}-${settlement.toId}-${index}`}
                className="flex items-center justify-between rounded-lg border border-border/70 bg-card/85 p-3 text-sm"
              >
                <span className="text-foreground">
                  <strong>{settlement.fromName}</strong> {t('mustPay') as string}{' '}
                  <strong>{settlement.toName}</strong>
                </span>
                <span className="font-bold text-accent">
                  {formatCurrency(settlement.amount, language)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noSettlementNeeded') as string}</p>
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/85 p-4 backdrop-blur-sm sm:p-5">
        <h3 className="mb-3 text-sm font-bold text-foreground sm:text-base">
          {t('settlementSummaryTitle') as string}
        </h3>

        <div className="space-y-2">
          {settlementSummary.map(row => (
            <div
              key={row.participantId}
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
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <Button
          onClick={handleShare}
          className="h-11 w-full gradient-primary text-sm sm:h-12 sm:text-base"
        >
          <Share2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          {t('shareWhatsApp') as string}
        </Button>

        <Button
          variant="outline"
          onClick={handleCopy}
          className="h-11 w-full text-sm sm:h-12 sm:text-base"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('copied') as string}
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('copyMessage') as string}
            </>
          )}
        </Button>

        <div className="flex gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="h-10 flex-1 text-sm sm:h-12 sm:text-base"
          >
            <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            {t('edit') as string}
          </Button>

          <Button
            variant="outline"
            onClick={onReset}
            className="h-10 flex-1 text-sm sm:h-12 sm:text-base"
          >
            <Wallet className="mr-2 h-4 w-4" />
            {t('newRide') as string}
          </Button>
        </div>
      </div>
    </div>
  )
}
