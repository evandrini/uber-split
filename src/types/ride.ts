export interface Participant {
  id: string;
  name: string;
}

export interface Stop {
  id: string
  name: string
  address: string
  lat?: number
  lon?: number
  entering: string[]
  exiting: string[]
}


export interface Leg {
  fromStop: Stop;
  toStop: Stop;
  distance: number; // in km
  passengers: string[]; // participant IDs in the car during this leg
}

export interface ParticipantCost {
  participantId: string;
  participantName: string;
  totalCost: number;
  legDetails: {
    from: string;
    to: string;
    cost: number;
    sharedWith: number;
  }[];
}

export interface DebugStop {
  index: number;
  stopId: string;
  label: string;
  entering: string[];
  exiting: string[];
  insideCar: string[];
}

export interface DebugLeg {
  index: number;
  from: string;
  to: string;
  distance: number;
  passengers: string[];
  cost: number;
  costSplit: {
    participantId: string;
    participantName: string;
    amount: number;
  }[];
}

export interface TripDebugCalculation {
  totalCost: number;
  totalDistance: number;
  costPerKm: number;
  paidById?: string;
  paidByName?: string;
  stops: DebugStop[];
  legs: DebugLeg[];
  totals: {
    participantId: string;
    participantName: string;
    totalCost: number;
  }[];
  log: string;
}

export interface UberSplitDebugObject {
  outbound?: TripDebugCalculation;
  return?: TripDebugCalculation;
  totals: {
    participantId: string;
    participantName: string;
    totalCost: number;
  }[];
  settlements: Settlement[];
  log: string;
}

export interface RideCalculation {
  totalCost: number;
  totalDistance: number;
  participantCosts: ParticipantCost[];
  legs: Leg[];
  paidById?: string;
  debug?: TripDebugCalculation;
}

export interface TripData {
  stops: Stop[];
  legs: Leg[];
  cost: string;
  paidBy: string;
}

export interface FullRideCalculation {
  outbound?: RideCalculation;
  return?: RideCalculation;
  combinedCosts: ParticipantCost[];
  totalCost: number;
  totalDistance: number;
  debug?: Omit<UberSplitDebugObject, 'settlements'>;
}

export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}
