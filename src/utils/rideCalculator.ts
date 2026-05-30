import type { Participant, Stop, Leg, ParticipantCost, RideCalculation, Settlement, FullRideCalculation } from '@/types/ride'
import type { Language } from '@/i18n/translations'
import type { TripDebugCalculation } from '@/types/ride'
import { translations } from '@/i18n/translations'
import { getLocaleConfig } from '@/i18n/localeConfig'

const isDebugMode = () => import.meta.env.DEV

const getStopLabel = (stop: Stop) => stop.name || stop.address || `Stop ${stop.id}`

const formatDebugCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const formatNameList = (names: string[]) => (names.length > 0 ? names.join(', ') : '-')

const buildTripDebugCalculation = (
  totalCost: number,
  totalDistance: number,
  legs: Leg[],
  participants: Participant[],
  participantCosts: ParticipantCost[],
  paidById?: string
): TripDebugCalculation => {
  const participantById = new Map(participants.map(participant => [participant.id, participant]))
  const participantName = (participantId: string) =>
    participantById.get(participantId)?.name || participantId
  const allStops = legs.length > 0 ? [legs[0].fromStop, ...legs.map(leg => leg.toStop)] : []
  const costPerKm = totalDistance > 0 ? totalCost / totalDistance : 0
  const insideCar = new Set<string>()

  const debugStops = allStops.map((stop, index) => {
    stop.exiting.forEach(participantId => insideCar.delete(participantId))
    stop.entering.forEach(participantId => insideCar.add(participantId))

    return {
      index: index + 1,
      stopId: stop.id,
      label: getStopLabel(stop),
      entering: stop.entering.map(participantName),
      exiting: stop.exiting.map(participantName),
      insideCar: Array.from(insideCar).map(participantName),
    }
  })

  const debugLegs = legs.map((leg, index) => {
    const legCost = leg.distance * costPerKm
    const splitAmount = leg.passengers.length > 0 ? legCost / leg.passengers.length : 0

    return {
      index: index + 1,
      from: getStopLabel(leg.fromStop),
      to: getStopLabel(leg.toStop),
      distance: leg.distance,
      passengers: leg.passengers.map(participantName),
      cost: legCost,
      costSplit: leg.passengers.map(participantId => ({
        participantId,
        participantName: participantName(participantId),
        amount: splitAmount,
      })),
    }
  })

  const totals = participantCosts.map(cost => ({
    participantId: cost.participantId,
    participantName: cost.participantName,
    totalCost: cost.totalCost,
  }))

  const logLines: string[] = []

  debugStops.forEach((stop, index) => {
    logLines.push(`STOP ${stop.index}`)
    logLines.push(`Entering: ${formatNameList(stop.entering)}`)
    logLines.push(`Exiting: ${formatNameList(stop.exiting)}`)
    logLines.push(`Inside car: ${formatNameList(stop.insideCar)}`)

    const leg = debugLegs[index]
    if (!leg) return

    logLines.push('')
    logLines.push(`LEG ${leg.index}`)
    logLines.push(`From: ${leg.from}`)
    logLines.push(`To: ${leg.to}`)
    logLines.push(`Distance: ${leg.distance.toFixed(2)} km`)
    logLines.push(`Passengers: ${formatNameList(leg.passengers)}`)
    logLines.push(`Cost: ${formatDebugCurrency(leg.cost)}`)
    logLines.push('Cost split:')

    if (leg.costSplit.length > 0) {
      leg.costSplit.forEach(split => {
        logLines.push(`${split.participantName}: ${formatDebugCurrency(split.amount)}`)
      })
    } else {
      logLines.push('-')
    }

    logLines.push('')
  })

  logLines.push('FINAL TOTALS')
  totals.forEach(total => {
    logLines.push(`${total.participantName}: ${formatDebugCurrency(total.totalCost)}`)
  })

  return {
    totalCost,
    totalDistance,
    costPerKm,
    paidById,
    paidByName: paidById ? participantName(paidById) : undefined,
    stops: debugStops,
    legs: debugLegs,
    totals,
    log: logLines.join('\n').trim(),
  }
}

const logTripDebugCalculation = (label: string, debug: TripDebugCalculation) => {
  if (!isDebugMode()) return

  console.groupCollapsed(`[Uber Split Debug] ${label}`)
  console.log(debug.log)
  console.log(debug)
  console.groupEnd()
}

export function calculateLegs(stops: Stop[], _participants: Participant[]): Leg[] {
  const legs: Leg[] = [];
  let currentPassengers: string[] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const fromStop = stops[i];
    const toStop = stops[i + 1];

    // Update passengers: add entering, remove exiting
    currentPassengers = [
      ...currentPassengers.filter(id => !fromStop.exiting.includes(id)),
      ...fromStop.entering,
    ];

    legs.push({
      fromStop,
      toStop,
      distance: 0, // Will be filled by user or Google Maps
      passengers: [...currentPassengers],
    });
  }

  return legs;
}

export function calculateCosts(
  totalCost: number,
  legs: Leg[],
  participants: Participant[],
  paidById?: string
): RideCalculation {
  const totalDistance = legs.reduce((sum, leg) => sum + leg.distance, 0);
  const participantCosts: Map<string, ParticipantCost> = new Map();

  // Initialize participant costs
  participants.forEach(p => {
    participantCosts.set(p.id, {
      participantId: p.id,
      participantName: p.name,
      totalCost: 0,
      legDetails: [],
    });
  });

  if (totalDistance === 0) {
    const participantCostsList = Array.from(participantCosts.values());
    const debug = isDebugMode()
      ? buildTripDebugCalculation(
          totalCost,
          0,
          legs,
          participants,
          participantCostsList,
          paidById
        )
      : undefined;
    if (debug) logTripDebugCalculation('Trip', debug);

    return {
      totalCost,
      totalDistance: 0,
      participantCosts: participantCostsList,
      legs,
      paidById,
      debug,
    };
  }

  const costPerKm = totalCost / totalDistance;

  // Calculate costs for each leg
  legs.forEach(leg => {
    const legCost = leg.distance * costPerKm;
    const passengerCount = leg.passengers.length;

    if (passengerCount > 0) {
      const costPerPerson = legCost / passengerCount;

      leg.passengers.forEach(passengerId => {
        const participantCost = participantCosts.get(passengerId);
        if (participantCost) {
          participantCost.totalCost += costPerPerson;
          participantCost.legDetails.push({
            from: leg.fromStop.name || leg.fromStop.address,
            to: leg.toStop.name || leg.toStop.address,
            cost: costPerPerson,
            sharedWith: passengerCount,
          });
        }
      });
    }
  });

  const participantCostsList = Array.from(participantCosts.values());
  const debug = isDebugMode()
    ? buildTripDebugCalculation(
        totalCost,
        totalDistance,
        legs,
        participants,
        participantCostsList,
        paidById
      )
    : undefined;
  if (debug) logTripDebugCalculation('Trip', debug);

  return {
    totalCost,
    totalDistance,
    participantCosts: participantCostsList,
    legs,
    paidById,
    debug,
  };
}

export function combineCalculations(
  outbound: RideCalculation | undefined,
  returnTrip: RideCalculation | undefined,
  participants: Participant[]
): FullRideCalculation {
  const combinedCosts: Map<string, ParticipantCost> = new Map();

  // Initialize with all participants
  participants.forEach(p => {
    combinedCosts.set(p.id, {
      participantId: p.id,
      participantName: p.name,
      totalCost: 0,
      legDetails: [],
    });
  });

  // Add outbound costs
  if (outbound) {
    outbound.participantCosts.forEach(cost => {
      const existing = combinedCosts.get(cost.participantId);
      if (existing) {
        existing.totalCost += cost.totalCost;
        existing.legDetails.push(...cost.legDetails);
      }
    });
  }

  // Add return costs
  if (returnTrip) {
    returnTrip.participantCosts.forEach(cost => {
      const existing = combinedCosts.get(cost.participantId);
      if (existing) {
        existing.totalCost += cost.totalCost;
        existing.legDetails.push(...cost.legDetails);
      }
    });
  }

  const totalCost = (outbound?.totalCost || 0) + (returnTrip?.totalCost || 0);
  const totalDistance = (outbound?.totalDistance || 0) + (returnTrip?.totalDistance || 0);
  const combinedCostsList = Array.from(combinedCosts.values());
  const debugTotals = isDebugMode()
    ? combinedCostsList.map(cost => ({
        participantId: cost.participantId,
        participantName: cost.participantName,
        totalCost: cost.totalCost,
      }))
    : [];
  const debug = isDebugMode()
    ? {
        outbound: outbound?.debug,
        return: returnTrip?.debug,
        totals: debugTotals,
        log: [
          outbound?.debug ? `OUTBOUND\n${outbound.debug.log}` : '',
          returnTrip?.debug ? `RETURN\n${returnTrip.debug.log}` : '',
          'FINAL TOTALS',
          ...debugTotals.map(total => `${total.participantName}: ${formatDebugCurrency(total.totalCost)}`),
        ].filter(Boolean).join('\n\n'),
      }
    : undefined;

  return {
    outbound,
    return: returnTrip,
    combinedCosts: combinedCostsList,
    totalCost,
    totalDistance,
    debug,
  };
}

export function calculateSettlements(
  fullCalculation: FullRideCalculation,
  participants: Participant[]
): Settlement[] {
  // Track how much each person paid and should pay
  const balances: Map<string, { paid: number; shouldPay: number; name: string }> = new Map();

  participants.forEach(p => {
    balances.set(p.id, { paid: 0, shouldPay: 0, name: p.name });
  });

  // Add what each person should pay (from combined costs)
  fullCalculation.combinedCosts.forEach(cost => {
    const balance = balances.get(cost.participantId);
    if (balance) {
      balance.shouldPay = cost.totalCost;
    }
  });

  // Add what each person paid
  if (fullCalculation.outbound?.paidById) {
    const balance = balances.get(fullCalculation.outbound.paidById);
    if (balance) {
      balance.paid += fullCalculation.outbound.totalCost;
    }
  }

  if (fullCalculation.return?.paidById) {
    const balance = balances.get(fullCalculation.return.paidById);
    if (balance) {
      balance.paid += fullCalculation.return.totalCost;
    }
  }

  // Calculate net balance for each person (positive = owed money, negative = owes money)
  const netBalances: { id: string; name: string; net: number }[] = [];
  balances.forEach((balance, id) => {
    const net = balance.paid - balance.shouldPay;
    netBalances.push({ id, name: balance.name, net });
  });

  // Split into creditors (positive net) and debtors (negative net)
  const creditors = netBalances.filter(b => b.net > 0.01).sort((a, b) => b.net - a.net);
  const debtors = netBalances.filter(b => b.net < -0.01).sort((a, b) => a.net - b.net);

  const settlements: Settlement[] = [];

  // Match debtors to creditors
  let creditorIdx = 0;
  let debtorIdx = 0;

  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const creditor = creditors[creditorIdx];
    const debtor = debtors[debtorIdx];

    const amount = Math.min(creditor.net, Math.abs(debtor.net));

    if (amount > 0.01) {
      settlements.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount,
      });
    }

    creditor.net -= amount;
    debtor.net += amount;

    if (creditor.net < 0.01) creditorIdx++;
    if (debtor.net > -0.01) debtorIdx++;
  }

  return settlements;
}

export function formatCurrency(value: number, language: Language = 'pt-BR'): string {
  const locale = getLocaleConfig(language)

  return new Intl.NumberFormat(locale.locale, {
    style: 'currency',
    currency: locale.currency,
  }).format(value)
}

export function generateWhatsAppText(
  fullCalculation: FullRideCalculation,
  settlements: Settlement[],
  language: Language = 'pt-BR'
): string {
  const t = translations[language];
  let text = `${t.whatsappTitle}\n\n`;
  
  // Outbound trip
  if (fullCalculation.outbound && fullCalculation.outbound.totalCost > 0) {
    text += `${t.whatsappOutbound}\n`;
    text += `${t.whatsappTotalValue}: ${formatCurrency(fullCalculation.outbound.totalCost, language)}\n`;
    text += `${t.whatsappDistance}: ${fullCalculation.outbound.totalDistance.toFixed(1)} km\n\n`;
  }

  // Return trip
  if (fullCalculation.return && fullCalculation.return.totalCost > 0) {
    text += `${t.whatsappReturn}\n`;
    text += `${t.whatsappTotalValue}: ${formatCurrency(fullCalculation.return.totalCost, language)}\n`;
    text += `${t.whatsappDistance}: ${fullCalculation.return.totalDistance.toFixed(1)} km\n\n`;
  }

  text += `${t.whatsappHowMuchEach}\n`;

  fullCalculation.combinedCosts
    .filter(p => p.totalCost > 0)
    .sort((a, b) => b.totalCost - a.totalCost)
    .forEach(p => {
      text += `• ${p.participantName}: ${formatCurrency(p.totalCost, language)}\n`;
    });

  if (settlements.length > 0) {
    text += `\n${t.whatsappSettlement}\n`;
    settlements.forEach(s => {
      if (language === 'en-US') {
        text += `• ${s.fromName} ${t.mustPay} ${formatCurrency(s.amount, language)} ${t.to} ${s.toName}\n`;
      } else {
        text += `• ${s.fromName} ${t.mustPay} ${formatCurrency(s.amount, language)} ${t.to} ${s.toName}\n`;
      }
    });
  }

  text += `\n${t.whatsappCalculated}`;

  return text;
}



