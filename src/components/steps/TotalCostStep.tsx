import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, ArrowRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Participant } from '@/types/ride';
import { useLanguage } from '@/i18n/LanguageContext';

interface TotalCostStepProps {
  outboundCost: string;
  returnCost: string;
  outboundPaidBy: string;
  returnPaidBy: string;
  onOutboundCostChange: (value: string) => void;
  onReturnCostChange: (value: string) => void;
  onOutboundPaidByChange: (value: string) => void;
  onReturnPaidByChange: (value: string) => void;
  participants: Participant[];
  onNext: () => void;
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
}: TotalCostStepProps) {
  const { t, language } = useLanguage();

  const handleCostChange = (value: string, setter: (v: string) => void) => {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    setter(cleaned);
  };

  const hasOutbound = parseFloat(outboundCost) > 0;
  const hasReturn = parseFloat(returnCost) > 0;
  const isValid = hasOutbound || hasReturn;

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl gradient-primary flex items-center justify-center">
          <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">
          {t('costTitle') as string}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          {t('costSubtitle') as string}
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Outbound cost */}
        <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 card-shadow space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
            <Label className="text-sm sm:text-base font-semibold">
              {t('outboundCost') as string} <span className="text-muted-foreground font-normal">{t('optional') as string}</span>
            </Label>
          </div>
          <div className="relative">
            <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm sm:text-base">
              R$
            </span>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={outboundCost}
              onChange={e => handleCostChange(e.target.value, onOutboundCostChange)}
              className="pl-10 sm:pl-12 text-lg sm:text-2xl h-11 sm:h-14 font-semibold"
            />
          </div>
          {hasOutbound && participants.length > 0 && (
            <Select value={outboundPaidBy} onValueChange={onOutboundPaidByChange}>
              <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base">
                <SelectValue placeholder={t('selectPayer') as string} />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Return cost */}
        <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 card-shadow space-y-3">
          <div className="flex items-center gap-2 text-accent">
            <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <Label className="text-sm sm:text-base font-semibold">
              {t('returnCost') as string} <span className="text-muted-foreground font-normal">{t('optional') as string}</span>
            </Label>
          </div>
          <div className="relative">
            <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm sm:text-base">
              R$
            </span>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={returnCost}
              onChange={e => handleCostChange(e.target.value, onReturnCostChange)}
              className="pl-10 sm:pl-12 text-lg sm:text-2xl h-11 sm:h-14 font-semibold"
            />
          </div>
          {hasReturn && participants.length > 0 && (
            <Select value={returnPaidBy} onValueChange={onReturnPaidByChange}>
              <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base">
                <SelectValue placeholder={t('selectPayer') as string} />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {!isValid && (
          <p className="text-sm text-muted-foreground text-center">
            {t('atLeastOneRequired') as string}
          </p>
        )}

        <Button
          onClick={onNext}
          disabled={!isValid}
          className="w-full h-11 sm:h-12 text-base sm:text-lg font-semibold gradient-primary hover:opacity-90 transition-opacity"
        >
          {t('continue') as string}
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
