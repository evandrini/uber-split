import type { Language } from '@/i18n/translations'
import type { Settlement } from '@/types/ride'
import { formatCurrency } from '@/utils/rideCalculator'

export const buildSharedRideMessage = (
  settlements: Settlement[],
  language: Language,
  shareUrl?: string,
) => {
  const transferLines =
    settlements.length > 0
      ? settlements.map(settlement => {
          const amount = formatCurrency(settlement.amount, language)
          if (language === 'pt-BR') return `${settlement.fromName} deve pagar ${amount} para ${settlement.toName}.`
          if (language === 'es-ES') return `${settlement.fromName} debe pagar ${amount} a ${settlement.toName}.`
          if (language === 'zh-CN') return `${settlement.fromName} 应向 ${settlement.toName} 支付 ${amount}。`
          return `${settlement.fromName} should pay ${settlement.toName} ${amount}.`
        })
      : [
          language === 'pt-BR'
            ? 'Nenhuma transferência é necessária.'
            : language === 'es-ES'
              ? 'No es necesaria ninguna transferencia.'
              : language === 'zh-CN'
                ? '无需转账。'
                : 'No transfers are needed.',
        ]

  const message = [
    '🚗 UberSplit',
    '',
    ...transferLines.map((line, index) => `${index === 0 ? '💸 ' : '   '}${line}`),
    '',
  ]

  if (shareUrl) {
    message.push(
      language === 'pt-BR'
        ? '👀 Veja como a divisão foi calculada:'
        : language === 'es-ES'
          ? '👀 Mira cómo se dividió el viaje:'
          : language === 'zh-CN'
            ? '👀 查看车费是如何分摊的：'
            : '👀 See how the fare was split:',
      shareUrl,
    )
  } else {
    message.push(
      language === 'pt-BR'
        ? 'Resultado calculado com UberSplit.'
        : language === 'es-ES'
          ? 'Resultado calculado con UberSplit.'
          : language === 'zh-CN'
            ? '结果由 UberSplit 计算。'
            : 'Result calculated with UberSplit.',
    )
  }

  return message.join('\n')
}
