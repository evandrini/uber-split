import type { Language } from '@/i18n/translations'

type DemoCopy = {
  payerName: string
  passengerNames: [string, string, string]
  destinationLabel: string
  locale: string
  currencyCode: string
  story: string
  problem: string
  solution: string
  routePreview: string
  rideFinished: string
  started: string
  entered: string
  peopleInCar: string
  totalLabel: string
  equalTitle: string
  equalEach: string
  equalWarning: string
  fairTitle: string
  paysTo: string
  payerShare: string
  distanceLabels: [string, string, string, string]
  accessibilityDescription: string
}

export type DemoScenario = DemoCopy & {
  totalFare: 80
  equalShare: 20
  proportionalShares: [40.5, 20.5, 12.5, 6.5]
  routeStops: [string, string, string, string, string]
  formatCurrency: (value: number) => string
}

const localizedScenarios: Record<Language, DemoCopy> = {
  'pt-BR': {
    payerName: 'Rodrigo',
    passengerNames: ['Vinícius', 'Felipe', 'Patrícia'],
    destinationLabel: 'Bar',
    locale: 'pt-BR',
    currencyCode: 'BRL',
    story: 'Rodrigo pagou uma corrida de R$ 80,00 para ir ao bar com três amigos. Como cada pessoa entrou em um ponto diferente, dividir por quatro não seria justo.',
    problem: 'A divisão igual ignora que Patrícia entrou perto do destino e percorreu muito menos.',
    solution: 'O UberSplit divide cada trecho somente entre quem estava no carro naquele momento.',
    routePreview: 'Demonstração da corrida',
    rideFinished: 'Corrida finalizada',
    started: 'iniciou a corrida',
    entered: 'entrou',
    peopleInCar: 'pessoas no carro',
    totalLabel: 'Total',
    equalTitle: 'Divisão igual',
    equalEach: 'para cada pessoa',
    equalWarning: 'Parece simples, mas ignora as distâncias.',
    fairTitle: 'Divisão proporcional',
    paysTo: 'paga para',
    payerShare: 'Parte de',
    distanceLabels: ['Trajeto completo', 'Trecho longo', 'Trecho intermediário', 'Trecho curto'],
    accessibilityDescription: 'Uma corrida fictícia começa com Rodrigo e busca Vinícius, Felipe e Patrícia em pontos diferentes antes de chegar ao bar. A comparação mostra que dividir igualmente é injusto e apresenta uma divisão proporcional.',
  },
  'en-US': {
    payerName: 'Michael',
    passengerNames: ['Jake', 'Emily', 'Sophia'],
    destinationLabel: 'Restaurant',
    locale: 'en-US',
    currencyCode: 'USD',
    story: 'Michael paid $80.00 for a ride to a restaurant with three friends. Since everyone joined at a different point, splitting it four ways would not be fair.',
    problem: 'An equal split ignores that Sophia joined near the destination and traveled much less.',
    solution: 'UberSplit shares each segment only among the people who were in the car at that time.',
    routePreview: 'Ride demonstration',
    rideFinished: 'Ride completed',
    started: 'started the ride',
    entered: 'joined',
    peopleInCar: 'people in the car',
    totalLabel: 'Total',
    equalTitle: 'Equal split',
    equalEach: 'each',
    equalWarning: 'It looks simple, but ignores distance.',
    fairTitle: 'Proportional split',
    paysTo: 'pays',
    payerShare: 'Share for',
    distanceLabels: ['Full route', 'Long distance', 'Medium distance', 'Short distance'],
    accessibilityDescription: 'A fictional ride starts with Michael and picks up Jake, Emily, and Sophia at different points before reaching a restaurant. The comparison explains why an equal split is unfair and shows a proportional split.',
  },
  'es-ES': {
    payerName: 'Alejandro',
    passengerNames: ['Daniel', 'Lucía', 'Sofía'],
    destinationLabel: 'Restaurante',
    locale: 'es-ES',
    currencyCode: 'EUR',
    story: 'Alejandro pagó un viaje de 80,00 € para ir a un restaurante con tres amigos. Como cada uno subió en un punto distinto, dividirlo entre cuatro no sería justo.',
    problem: 'La división igual ignora que Sofía subió cerca del destino y recorrió mucho menos.',
    solution: 'UberSplit reparte cada tramo solo entre quienes estaban en el coche en ese momento.',
    routePreview: 'Demostración del viaje',
    rideFinished: 'Viaje finalizado',
    started: 'inició el viaje',
    entered: 'subió',
    peopleInCar: 'personas en el coche',
    totalLabel: 'Total',
    equalTitle: 'División igual',
    equalEach: 'por persona',
    equalWarning: 'Parece sencillo, pero ignora las distancias.',
    fairTitle: 'División proporcional',
    paysTo: 'paga a',
    payerShare: 'Parte de',
    distanceLabels: ['Ruta completa', 'Trayecto largo', 'Trayecto intermedio', 'Trayecto corto'],
    accessibilityDescription: 'Un viaje ficticio comienza con Alejandro y recoge a Daniel, Lucía y Sofía en puntos diferentes antes de llegar a un restaurante. La comparación explica por qué una división igual es injusta y muestra una división proporcional.',
  },
  'zh-CN': {
    payerName: '李明',
    passengerNames: ['王伟', '张敏', '刘洋'],
    destinationLabel: '餐厅',
    locale: 'zh-CN',
    currencyCode: 'CNY',
    story: '李明支付了 ¥80.00，和三位朋友一起去餐厅。由于每个人上车的位置不同，平均分成四份并不公平。',
    problem: '平均分摊忽略了刘洋在接近终点时才上车，乘坐距离明显更短。',
    solution: 'UberSplit 只让当时在车内的乘客共同分摊每个路段。',
    routePreview: '行程演示',
    rideFinished: '行程已结束',
    started: '开始了行程',
    entered: '上车',
    peopleInCar: '人在车内',
    totalLabel: '总计',
    equalTitle: '平均分摊',
    equalEach: '每人',
    equalWarning: '看似简单，却忽略了乘坐距离。',
    fairTitle: '按路程分摊',
    paysTo: '应付给',
    payerShare: '个人承担',
    distanceLabels: ['完整路线', '较长路程', '中等路程', '较短路程'],
    accessibilityDescription: '虚构行程由李明开始，途中分别接上王伟、张敏和刘洋，最后到达餐厅。对比说明平均分摊为何不公平，并展示按路程分摊的结果。',
  },
}

export function getDemoScenario(language: Language): DemoScenario {
  const copy = localizedScenarios[language]
  const names = [copy.payerName, ...copy.passengerNames] as [string, string, string, string]
  return {
    ...copy,
    totalFare: 80,
    equalShare: 20,
    proportionalShares: [40.5, 20.5, 12.5, 6.5],
    routeStops: [...names, copy.destinationLabel],
    formatCurrency: value =>
      new Intl.NumberFormat(copy.locale, {
        style: 'currency',
        currency: copy.currencyCode,
      }).format(value),
  }
}
