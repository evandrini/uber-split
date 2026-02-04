import { Participant, Stop, Leg, ParticipantCost, RideCalculation, Settlement, FullRideCalculation } from '@/types/ride';
import { Language, translations } from '@/i18n/translations';

export function calculateLegs(stops: Stop[], participants: Participant[]): Leg[] {
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
  
  if (totalDistance === 0) {
    return {
      totalCost,
      totalDistance: 0,
      participantCosts: participants.map(p => ({
        participantId: p.id,
        participantName: p.name,
        totalCost: 0,
        legDetails: [],
      })),
      legs,
      paidById,
    };
  }

  const costPerKm = totalCost / totalDistance;
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

  return {
    totalCost,
    totalDistance,
    participantCosts: Array.from(participantCosts.values()),
    legs,
    paidById,
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

  return {
    outbound,
    return: returnTrip,
    combinedCosts: Array.from(combinedCosts.values()),
    totalCost,
    totalDistance,
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
  if (language === 'en-US') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value).replace('$', 'R$');
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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
