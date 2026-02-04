export interface Participant {
  id: string;
  name: string;
}

export interface Stop {
  id: string;
  name: string;
  address: string;
  entering: string[]; // participant IDs entering at this stop
  exiting: string[]; // participant IDs exiting at this stop
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

export interface RideCalculation {
  totalCost: number;
  totalDistance: number;
  participantCosts: ParticipantCost[];
  legs: Leg[];
  paidById?: string;
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
}

export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}
