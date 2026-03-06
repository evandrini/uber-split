import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DollarSign, ArrowRight, ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import type { Participant } from '@/types/ride'
import { useLanguage } from '@/i18n/LanguageContext'
import { getLocaleConfig } from '@/i18n/localeConfig'
import { hapticPulse } from '@/lib/haptics'

interface TotalCostStepProps {
  outboundCost: string
  returnCost: string
  outboundPaidBy: string
  returnPaidBy: string
  onOutboundCostChange: (value: string) => void
  onReturnCostChange: (value: string) => void
  onOutboundPaidByChange: (value: string) => void
  onReturnPaidByChange: (value: string) => void
  participants: Participant[]
  onNext: () => void
  onBack: () => void
}

export function TotalCostStep({
  outboundCost,
  returnCost,
  outboundPaidBy,
  returnPaidBy,
  onOutboundCostChange,
  onReturnCostChange,
  onOutboundPaidByChange,
  onReturnPaidByChange,
  participants,
  onNext,
  onBack,
}: TotalCostStepProps) {
  const { t, language } = useLanguage()
  const locale = getLocaleConfig(language)

  const handleCostChange = (value: string, setter: (v: string) => void) => {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.')
    setter(cleaned)
  }

  const hasOutbound = parseFloat(outboundCost) > 0
  const hasReturn = parseFloat(returnCost) > 0
  const hasAnyCost = hasOutbound || hasReturn

  const outboundPayerValid = !hasOutbound || outboundPaidBy.length > 0
  const returnPayerValid = !hasReturn || returnPaidBy.length > 0

  const payerSelectionValid = outboundPayerValid && returnPayerValid
  const isValid = hasAnyCost && payerSelectionValid

  return (
    <div className="animate-fade-in">
      <div className="mb-6 text-center sm:mb-8">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl gradient-primary sm:mb-4 sm:h-16 sm:w-16 sm:rounded-2xl">
          <DollarSign className="h-7 w-7 text-primary-foreground sm:h-8 sm:w-8" />
        </div>
        <h2 className="mb-1 text-xl font-bold text-foreground sm:mb-2 sm:text-2xl">
          {t('costTitle') as string}
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          {t('costSubtitle') as string}
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-3 rounded-lg bg-card p-3 card-shadow sm:rounded-xl sm:p-4">
          <div className="flex items-center gap-2 text-primary">
            <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
            <Label className="text-sm font-semibold sm:text-base">
              {t('outboundCost') as string}{' '}
              <span className="font-normal text-muted-foreground">
                {t('optional') as string}
              </span>
            </Label>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground sm:left-4">
              {locale.currencySymbol}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={locale.decimalExample}
              value={outboundCost}
              onChange={e => handleCostChange(e.target.value, onOutboundCostChange)}
              onBlur={() => {
                if (parseFloat(outboundCost) > 0) hapticPulse(6)
              }}
              className="h-11 pl-10 text-lg font-semibold sm:h-14 sm:pl-12 sm:text-2xl"
            />
          </div>

          {hasOutbound && participants.length > 0 && (
            <Select value={outboundPaidBy} onValueChange={onOutboundPaidByChange}>
              <SelectTrigger className="h-10 sm:h-12">
                <SelectValue placeholder={t('selectPayer') as string} />
              </SelectTrigger>
              <SelectContent>
                {participants.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-3 rounded-lg bg-card p-3 card-shadow sm:rounded-xl sm:p-4">
          <div className="flex items-center gap-2 text-accent">
            <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <Label className="text-sm font-semibold sm:text-base">
              {t('returnCost') as string}{' '}
              <span className="font-normal text-muted-foreground">
                {t('optional') as string}
              </span>
            </Label>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground sm:left-4">
              {locale.currencySymbol}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={locale.decimalExample}
              value={returnCost}
              onChange={e => handleCostChange(e.target.value, onReturnCostChange)}
              onBlur={() => {
                if (parseFloat(returnCost) > 0) hapticPulse(6)
              }}
              className="h-11 pl-10 text-lg font-semibold sm:h-14 sm:pl-12 sm:text-2xl"
            />
          </div>

          {hasReturn && participants.length > 0 && (
            <Select value={returnPaidBy} onValueChange={onReturnPaidByChange}>
              <SelectTrigger className="h-10 sm:h-12">
                <SelectValue placeholder={t('selectPayer') as string} />
              </SelectTrigger>
              <SelectContent>
                {participants.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {!hasAnyCost && (
          <p className="text-center text-sm text-muted-foreground">
            {t('atLeastOneRequired') as string}
          </p>
        )}

        {hasAnyCost && !payerSelectionValid && (
          <p className="text-center text-sm text-muted-foreground">
            {t('payerRequiredMessage') as string}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="h-11 flex-1 sm:h-12 btn-pop"
          >
            <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            {t('back') as string}
          </Button>

          <Button
            onClick={onNext}
            disabled={!isValid}
            className="h-11 flex-1 gradient-primary text-base font-semibold sm:h-12 sm:text-lg btn-slide"
          >
            {t('continue') as string}
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
