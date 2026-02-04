import { useState, useEffect } from 'react';
import { StepIndicator } from '@/components/StepIndicator';
import { TotalCostStep } from '@/components/steps/TotalCostStep';
import { ParticipantsStep } from '@/components/steps/ParticipantsStep';
import { StopsStep } from '@/components/steps/StopsStep';
import { ResultStep } from '@/components/steps/ResultStep';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Participant, Stop, Leg, TripData, FullRideCalculation } from '@/types/ride';
import { calculateLegs, calculateCosts, combineCalculations, calculateSettlements } from '@/utils/rideCalculator';
import { Car, Info } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const Index = () => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // Cost states
  const [outboundCost, setOutboundCost] = useState('');
  const [returnCost, setReturnCost] = useState('');
  const [outboundPaidBy, setOutboundPaidBy] = useState('');
  const [returnPaidBy, setReturnPaidBy] = useState('');
  
  // Trip data states
  const [outboundTrip, setOutboundTrip] = useState<TripData>({
    stops: [],
    legs: [],
    cost: '',
    paidBy: '',
  });
  const [returnTrip, setReturnTrip] = useState<TripData>({
    stops: [],
    legs: [],
    cost: '',
    paidBy: '',
  });
  
  const [fullCalculation, setFullCalculation] = useState<FullRideCalculation | null>(null);

  const hasOutbound = parseFloat(outboundCost) > 0;
  const hasReturn = parseFloat(returnCost) > 0;

  // Calculate legs when stops change
  useEffect(() => {
    if (outboundTrip.stops.length >= 2) {
      const newLegs = calculateLegs(outboundTrip.stops, participants);
      const updatedLegs = newLegs.map((leg, index) => ({
        ...leg,
        distance: outboundTrip.legs[index]?.distance || 0,
      }));
      if (JSON.stringify(updatedLegs) !== JSON.stringify(outboundTrip.legs)) {
        setOutboundTrip(prev => ({ ...prev, legs: updatedLegs }));
      }
    }
  }, [outboundTrip.stops, participants]);

  useEffect(() => {
    if (returnTrip.stops.length >= 2) {
      const newLegs = calculateLegs(returnTrip.stops, participants);
      const updatedLegs = newLegs.map((leg, index) => ({
        ...leg,
        distance: returnTrip.legs[index]?.distance || 0,
      }));
      if (JSON.stringify(updatedLegs) !== JSON.stringify(returnTrip.legs)) {
        setReturnTrip(prev => ({ ...prev, legs: updatedLegs }));
      }
    }
  }, [returnTrip.stops, participants]);

  const initializeTrips = () => {
    if (hasOutbound && outboundTrip.stops.length === 0) {
      setOutboundTrip({
        stops: [
          { id: crypto.randomUUID(), name: '', address: '', entering: participants.map(p => p.id), exiting: [] },
          { id: crypto.randomUUID(), name: '', address: '', entering: [], exiting: participants.map(p => p.id) },
        ],
        legs: [],
        cost: outboundCost,
        paidBy: outboundPaidBy,
      });
    }
    if (hasReturn && returnTrip.stops.length === 0) {
      setReturnTrip({
        stops: [
          { id: crypto.randomUUID(), name: '', address: '', entering: participants.map(p => p.id), exiting: [] },
          { id: crypto.randomUUID(), name: '', address: '', entering: [], exiting: participants.map(p => p.id) },
        ],
        legs: [],
        cost: returnCost,
        paidBy: returnPaidBy,
      });
    }
  };

  const handleCalculate = () => {
    let outboundCalc = undefined;
    let returnCalc = undefined;

    if (hasOutbound && outboundTrip.legs.length > 0) {
      outboundCalc = calculateCosts(parseFloat(outboundCost), outboundTrip.legs, participants, outboundPaidBy);
    }

    if (hasReturn && returnTrip.legs.length > 0) {
      returnCalc = calculateCosts(parseFloat(returnCost), returnTrip.legs, participants, returnPaidBy);
    }

    const combined = combineCalculations(outboundCalc, returnCalc, participants);
    setFullCalculation(combined);
    setCurrentStep(4);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setOutboundCost('');
    setReturnCost('');
    setOutboundPaidBy('');
    setReturnPaidBy('');
    setParticipants([]);
    setOutboundTrip({ stops: [], legs: [], cost: '', paidBy: '' });
    setReturnTrip({ stops: [], legs: [], cost: '', paidBy: '' });
    setFullCalculation(null);
  };

  const steps = t('steps') as readonly string[];

  return (
    <div className="min-h-screen bg-background gradient-subtle">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Car className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">UberSplit</h1>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4 sm:py-6 pb-16 sm:pb-20 px-3 sm:px-4">
        <div className="max-w-md mx-auto">
          {/* Introduction */}
          <div className="bg-primary/5 border border-primary/10 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex gap-2 sm:gap-3">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xs sm:text-sm font-semibold text-foreground mb-1">
                  {t('introTitle') as string}
                </h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                  {t('introText') as string}
                </p>
              </div>
            </div>
          </div>

          <StepIndicator
            currentStep={currentStep}
            totalSteps={4}
            labels={[...steps]}
          />

          <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 card-shadow">
            {currentStep === 1 && (
              <ParticipantsStep
                participants={participants}
                onParticipantsChange={setParticipants}
                onNext={() => setCurrentStep(2)}
                onBack={() => {}}
              />
            )}

            {currentStep === 2 && (
              <TotalCostStep
                outboundCost={outboundCost}
                returnCost={returnCost}
                outboundPaidBy={outboundPaidBy}
                returnPaidBy={returnPaidBy}
                onOutboundCostChange={setOutboundCost}
                onReturnCostChange={setReturnCost}
                onOutboundPaidByChange={setOutboundPaidBy}
                onReturnPaidByChange={setReturnPaidBy}
                participants={participants}
                onNext={() => {
                  initializeTrips();
                  setCurrentStep(3);
                }}
              />
            )}

            {currentStep === 3 && (
              <StopsStep
                hasOutbound={hasOutbound}
                hasReturn={hasReturn}
                outboundTrip={outboundTrip}
                returnTrip={returnTrip}
                participants={participants}
                onOutboundChange={setOutboundTrip}
                onReturnChange={setReturnTrip}
                onNext={handleCalculate}
                onBack={() => setCurrentStep(2)}
              />
            )}

            {currentStep === 4 && fullCalculation && (
              <ResultStep
                fullCalculation={fullCalculation}
                participants={participants}
                settlements={calculateSettlements(fullCalculation, participants)}
                onBack={() => setCurrentStep(3)}
                onReset={handleReset}
              />
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-4 sm:mt-6">
            {t('tagline') as string}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
