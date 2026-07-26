import type { Settlement } from '@/types/ride'
import { formatCurrency } from '@/utils/rideCalculator'

export const buildSharedRideMessage = (
  settlements: Settlement[],
  language: string,
  shareUrl: string,
) => {
  const isPortuguese = language === 'pt-BR'
  const transferLines =
    settlements.length > 0
      ? settlements.map(settlement =>
          isPortuguese
            ? `${settlement.fromName} deve pagar ${formatCurrency(settlement.amount, language)} para ${settlement.toName}.`
            : `${settlement.fromName} should pay ${formatCurrency(settlement.amount, language)} to ${settlement.toName}.`,
        )
      : [
          isPortuguese
            ? 'Nenhuma transferência é necessária.'
            : 'No transfers are needed.',
        ]

  return [
    'UberSplit',
    '',
    ...transferLines,
    '',
    isPortuguese
      ? 'Confira os detalhes da divisão:'
      : 'View the full breakdown:',
    shareUrl,
  ].join('\n')
}
