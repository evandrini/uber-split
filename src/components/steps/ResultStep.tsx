import { Button } from '@/components/ui/button'
import { ArrowLeft, Check, MapPin, Share2, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Participant, Settlement, FullRideCalculation } from '@/types/ride'
import { formatCurrency, generateWhatsAppText } from '@/utils/rideCalculator'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n/LanguageContext'

interface ResultStepProps {
  fullCalculation: FullRideCalculation
  participants: Participant[]
  settlements: Settlement[]
  onBack: () => void
  onReset: () => void
}

export function ResultStep({ fullCalculation, participants, settlements, onBack, onReset }: ResultStepProps) {
  const [copied, setCopied] = useState(false)
  const { t, language } = useLanguage()

  //////////////////////////////////////////////////////
  // COPY MESSAGE
  //////////////////////////////////////////////////////

  const buildShareMessage = () => {
    const baseText = generateWhatsAppText(fullCalculation, settlements, language)

    const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''

    const promoText =
      language === 'pt-BR'
        ? '\n\n🚀 Faça sua própria divisão aqui:\n'
        : '\n\n🚀 Split your ride here:\n'

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

  //////////////////////////////////////////////////////
  // WHATSAPP SHARE (DIRECT LINK)
  //////////////////////////////////////////////////////

  const handleShare = () => {
    const message = buildShareMessage()
    const encoded = encodeURIComponent(message)
    const url = `https://wa.me/?text=${encoded}`

    window.open(url, '_blank')
  }

  //////////////////////////////////////////////////////

  const sortedCosts = [...fullCalculation.combinedCosts]
    .filter(p => p.totalCost > 0)
    .sort((a, b) => b.totalCost - a.totalCost)

  const outboundPayer = fullCalculation.outbound?.paidById
    ? participants.find(p => p.id === fullCalculation.outbound?.paidById)
    : null

  const returnPayer = fullCalculation.return?.paidById
    ? participants.find(p => p.id === fullCalculation.return?.paidById)
    : null

  //////////////////////////////////////////////////////

  return (
    <div className="animate-fade-in">

      <div className="text-center mb-4 sm:mb-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl gradient-primary flex items-center justify-center">
          <Check className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">
          {t('resultTitle') as string}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          {t('resultSubtitle') as string}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 card-shadow">
          <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground mb-0.5 sm:mb-1">
            <span className="text-lg sm:text-2xl">💰</span>
            <span className="text-[10px] sm:text-xs font-medium">{t('total') as string}</span>
          </div>
          <p className="text-base sm:text-xl font-bold text-foreground">
            {formatCurrency(fullCalculation.totalCost, language)}
          </p>
        </div>

        <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 card-shadow">
          <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground mb-0.5 sm:mb-1">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs font-medium">{t('distance') as string}</span>
          </div>
          <p className="text-base sm:text-xl font-bold text-foreground">
            {fullCalculation.totalDistance.toFixed(1)} km
          </p>
        </div>
      </div>

      {/* Trip Details */}
      <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">

        {fullCalculation.outbound && fullCalculation.outbound.totalCost > 0 && (
          <div className="bg-primary/5 border border-primary/10 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{t('outbound') as string}</span>
              </div>
              <span className="text-sm font-bold">
                {formatCurrency(fullCalculation.outbound.totalCost, language)}
              </span>
            </div>
            {outboundPayer && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Wallet className="w-3 h-3" />
                <span>{t('whoPaid') as string}: {outboundPayer.name}</span>
              </div>
            )}
          </div>
        )}

        {fullCalculation.return && fullCalculation.return.totalCost > 0 && (
          <div className="bg-accent/5 border border-accent/10 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">{t('return') as string}</span>
              </div>
              <span className="text-sm font-bold">
                {formatCurrency(fullCalculation.return.totalCost, language)}
              </span>
            </div>
            {returnPayer && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Wallet className="w-3 h-3" />
                <span>{t('whoPaid') as string}: {returnPayer.name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Individual Costs */}
      <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
        <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('perPerson') as string}
        </h3>

        {sortedCosts.map((cost, index) => (
          <div
            key={cost.participantId}
            className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 card-shadow animate-slide-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >

            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-sm sm:text-lg">👤</span>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-semibold text-foreground">
                    {cost.participantName}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {cost.legDetails.length} {cost.legDetails.length !== 1 ? t('legsPlural') as string : t('legs') as string}
                  </p>
                </div>
              </div>

              <p className="text-base sm:text-xl font-bold text-accent">
                {formatCurrency(cost.totalCost, language)}
              </p>
            </div>

          </div>
        ))}
      </div>

      {/* Settlement */}
      {settlements.length > 0 && (
        <div className="bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20 rounded-lg sm:rounded-xl p-4 sm:p-5 mb-4 sm:mb-6">
          <h3 className="text-sm sm:text-base font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <span className="text-lg sm:text-xl">💸</span>
            {t('finalSettlement') as string}
          </h3>

          <div className="space-y-2 sm:space-y-3">
            {settlements.map((settlement, index) => (
              <div
                key={index}
                className="bg-card/80 backdrop-blur rounded-lg p-3 sm:p-4 flex items-center justify-between animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="text-sm">
                  {settlement.fromName} → {settlement.toName}
                </span>
                <span className="font-bold text-accent">
                  {formatCurrency(settlement.amount, language)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIONS */}
      <div className="space-y-2 sm:space-y-3">

        <Button
          onClick={handleShare}
          className="w-full h-10 sm:h-12 text-sm sm:text-base gradient-primary"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t('copied') as string}
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t('shareWhatsApp') as string}
            </>
          )}
        </Button>

        <div className="flex gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {t('edit') as string}
          </Button>

          <Button
            variant="outline"
            onClick={onReset}
            className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
          >
            {t('newRide') as string}
          </Button>
        </div>

      </div>
    </div>
  )
}