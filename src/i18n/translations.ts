export type Language = 'pt-BR' | 'en-US';

export const translations = {
  'pt-BR': {
    // Header
    appName: 'UberSplit',
    tagline: 'Divida corridas de forma justa ✨',

    // Introduction
    introTitle: 'Divisão justa de corridas',
    introText: 'Este site ajuda a dividir corridas de Uber de forma justa quando existem múltiplas paradas. Cada pessoa paga apenas o trecho em que esteve no carro, evitando que quem mora mais perto pague pela viagem inteira dos outros.',

    // Steps
    steps: ['Pessoas', 'Valor', 'Paradas', 'Resultado'],

    // Participants step
    participantsTitle: 'Participantes',
    participantsSubtitle: 'Quem estava na corrida?',
    participantPlaceholder: 'Nome do participante',
    addParticipant: 'Adicionar',
    minParticipants: 'Adicione pelo menos 2 participantes',
    continue: 'Continuar',

    // Cost step
    costTitle: 'Valor da Corrida',
    costSubtitle: 'Informe os valores da ida e/ou volta',
    outboundCost: 'Valor da Ida (R$)',
    returnCost: 'Valor da Volta (R$)',
    optional: '(opcional)',
    outboundPaidBy: 'Quem pagou a ida?',
    returnPaidBy: 'Quem pagou a volta?',
    selectPayer: 'Selecione quem pagou',
    atLeastOneRequired: 'Informe pelo menos um valor',

    // Stops step
    stopsTitle: 'Paradas',
    stopsSubtitle: 'Adicione origem, paradas e destino',
    outboundTrip: 'Corrida de Ida',
    returnTrip: 'Corrida de Volta',
    useReverseRoute: 'Usar caminho inverso da ida',
    origin: 'Origem',
    finalDestination: 'Destino final',
    intermediateStop: 'Parada intermediária',
    whoExitsHere: 'Quem sai aqui?',
    whoEntersHere: 'Quem entra aqui?',
    addStop: 'Adicionar Parada',
    minStops: 'Adicione pelo menos origem e destino',
    back: 'Voltar',
    calculate: 'Calcular',

    // Result step
    resultTitle: 'Resultado',
    resultSubtitle: 'Veja quanto cada um deve pagar',
    total: 'Total',
    distance: 'Distância',
    whoPaid: 'Quem pagou',
    outbound: 'Ida',
    return: 'Volta',
    perPerson: 'Divisão por pessoa',
    legs: 'trecho',
    legsPlural: 'trechos',

    // Settlement
    finalSettlement: 'Acerto Final',
    mustPay: 'deve pagar',
    to: 'para',

    // Actions
    shareWhatsApp: 'Compartilhar no WhatsApp',
    copied: 'Copiado!',
    edit: 'Editar',
    newRide: 'Nova Corrida',
    copySuccess: 'Copiado para a área de transferência!',
    copyError: 'Erro ao copiar',

    // WhatsApp message
    whatsappTitle: '🚗 *Divisão da Corrida de Uber*',
    whatsappOutbound: '📍 *Ida*',
    whatsappReturn: '📍 *Volta*',
    whatsappTotalValue: '💰 Valor',
    whatsappDistance: '📍 Distância',
    whatsappHowMuchEach: '*Quanto cada um deveria pagar:*',
    whatsappSettlement: '💸 *Acerto Final:*',
    whatsappCalculated: '_Calculado com UberSplit_ ✨',
  },
  'en-US': {
    // Header
    appName: 'UberSplit',
    tagline: 'Split rides fairly ✨',

    // Introduction
    introTitle: 'Fair ride splitting',
    introText: 'This site helps split Uber rides fairly when there are multiple stops. Each person pays only for the part of the trip they were actually in the car, so people who live closer are not overcharged.',

    // Steps
    steps: ['People', 'Cost', 'Stops', 'Result'],

    // Participants step
    participantsTitle: 'Participants',
    participantsSubtitle: 'Who was on the ride?',
    participantPlaceholder: 'Participant name',
    addParticipant: 'Add',
    minParticipants: 'Add at least 2 participants',
    continue: 'Continue',

    // Cost step
    costTitle: 'Ride Cost',
    costSubtitle: 'Enter outbound and/or return costs',
    outboundCost: 'Outbound Cost',
    returnCost: 'Return Cost',
    optional: '(optional)',
    outboundPaidBy: 'Who paid for outbound?',
    returnPaidBy: 'Who paid for return?',
    selectPayer: 'Select who paid',
    atLeastOneRequired: 'Enter at least one cost',

    // Stops step
    stopsTitle: 'Stops',
    stopsSubtitle: 'Add origin, stops and destination',
    outboundTrip: 'Outbound Trip',
    returnTrip: 'Return Trip',
    useReverseRoute: 'Use reverse route',
    origin: 'Origin',
    finalDestination: 'Final destination',
    intermediateStop: 'Intermediate stop',
    whoExitsHere: 'Who exits here?',
    whoEntersHere: 'Who enters here?',
    addStop: 'Add Stop',
    minStops: 'Add at least origin and destination',
    back: 'Back',
    calculate: 'Calculate',

    // Result step
    resultTitle: 'Result',
    resultSubtitle: 'See how much each person owes',
    total: 'Total',
    distance: 'Distance',
    whoPaid: 'Who paid',
    outbound: 'Outbound',
    return: 'Return',
    perPerson: 'Per person breakdown',
    legs: 'leg',
    legsPlural: 'legs',

    // Settlement
    finalSettlement: 'Final Settlement',
    mustPay: 'must pay',
    to: 'to',

    // Actions
    shareWhatsApp: 'Share on WhatsApp',
    copied: 'Copied!',
    edit: 'Edit',
    newRide: 'New Ride',
    copySuccess: 'Copied to clipboard!',
    copyError: 'Error copying',

    // WhatsApp message
    whatsappTitle: '🚗 *Uber Ride Split*',
    whatsappOutbound: '📍 *Outbound*',
    whatsappReturn: '📍 *Return*',
    whatsappTotalValue: '💰 Total',
    whatsappDistance: '📍 Distance',
    whatsappHowMuchEach: '*How much each should pay:*',
    whatsappSettlement: '💸 *Final Settlement:*',
    whatsappCalculated: '_Calculated with UberSplit_ ✨',
  },
} as const;

export type TranslationKey = keyof typeof translations['pt-BR'];
