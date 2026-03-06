import { useState, useEffect } from 'react'
import { StepIndicator } from '@/components/StepIndicator'
import { TotalCostStep } from '@/components/steps/TotalCostStep'
import { ParticipantsStep } from '@/components/steps/ParticipantsStep'
import { StopsStep } from '@/components/steps/StopsStep'
import { ResultStep } from '@/components/steps/ResultStep'
import { LanguageSelector } from '@/components/LanguageSelector'
import type {
  Participant,
  TripData,
  FullRideCalculation,
  Stop,
} from '@/types/ride'
import {
  calculateLegs,
  calculateCosts,
  combineCalculations,
  calculateSettlements,
} from '@/utils/rideCalculator'
import { Car, Sparkles } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'

const Index = () => {
  const { t } = useLanguage()

  const [currentStep, setCurrentStep] = useState(1)
  const [participants, setParticipants] = useState<Participant[]>([])

  const [outboundCost, setOutboundCost] = useState('')
  const [returnCost, setReturnCost] = useState('')
  const [outboundPaidBy, setOutboundPaidBy] = useState('')
  const [returnPaidBy, setReturnPaidBy] = useState('')

  const [outboundTrip, setOutboundTrip] = useState<TripData>({
    stops: [],
    legs: [],
    cost: '',
    paidBy: '',
  })

  const [returnTrip, setReturnTrip] = useState<TripData>({
    stops: [],
    legs: [],
    cost: '',
    paidBy: '',
  })

  const [fullCalculation, setFullCalculation] =
    useState<FullRideCalculation | null>(null)

  const hasOutbound = parseFloat(outboundCost) > 0
  const hasReturn = parseFloat(returnCost) > 0

  const buildReverseStops = (sourceStops: Stop[]) => {
    const allParticipantIds = participants.map(participant => participant.id)
    const reversed = [...sourceStops].reverse()

    return reversed.map((stop, index) => ({
      ...stop,
      id: crypto.randomUUID(),
      entering: index === 0 ? allParticipantIds : [],
      exiting: index === reversed.length - 1 ? allParticipantIds : [],
    }))
  }

  const applyReverseRouteToReturn = () => {
    if (outboundTrip.stops.length < 2) return

    const reversedStops = buildReverseStops(outboundTrip.stops)
    const reversedLegs = calculateLegs(reversedStops, participants).map(leg => ({
      ...leg,
      distance: 0,
    }))

    setReturnTrip(prev => ({
      ...prev,
      stops: reversedStops,
      legs: reversedLegs,
    }))
  }

  useEffect(() => {
    if (outboundTrip.stops.length >= 2) {
      const newLegs = calculateLegs(outboundTrip.stops, participants)
      const updatedLegs = newLegs.map((leg, index) => ({
        ...leg,
        distance: outboundTrip.legs[index]?.distance || 0,
      }))

      if (JSON.stringify(updatedLegs) !== JSON.stringify(outboundTrip.legs)) {
        setOutboundTrip(prev => ({ ...prev, legs: updatedLegs }))
      }
    }
  }, [outboundTrip.stops, participants])

  useEffect(() => {
    if (returnTrip.stops.length >= 2) {
      const newLegs = calculateLegs(returnTrip.stops, participants)
      const updatedLegs = newLegs.map((leg, index) => ({
        ...leg,
        distance: returnTrip.legs[index]?.distance || 0,
      }))

      if (JSON.stringify(updatedLegs) !== JSON.stringify(returnTrip.legs)) {
        setReturnTrip(prev => ({ ...prev, legs: updatedLegs }))
      }
    }
  }, [returnTrip.stops, participants])

  const initializeTrips = () => {
    if (hasOutbound && outboundTrip.stops.length === 0) {
      setOutboundTrip({
        stops: [
          {
            id: crypto.randomUUID(),
            name: '',
            address: '',
            entering: participants.map(p => p.id),
            exiting: [],
          },
          {
            id: crypto.randomUUID(),
            name: '',
            address: '',
            entering: [],
            exiting: participants.map(p => p.id),
          },
        ],
        legs: [],
        cost: outboundCost,
        paidBy: outboundPaidBy,
      })
    }

    if (hasReturn && returnTrip.stops.length === 0) {
      setReturnTrip({
        stops: [
          {
            id: crypto.randomUUID(),
            name: '',
            address: '',
            entering: participants.map(p => p.id),
            exiting: [],
          },
          {
            id: crypto.randomUUID(),
            name: '',
            address: '',
            entering: [],
            exiting: participants.map(p => p.id),
          },
        ],
        legs: [],
        cost: returnCost,
        paidBy: returnPaidBy,
      })
    }
  }

  const handleCalculate = () => {
    let outboundCalc
    let returnCalc

    if (hasOutbound && outboundTrip.legs.length > 0) {
      outboundCalc = calculateCosts(
        parseFloat(outboundCost),
        outboundTrip.legs,
        participants,
        outboundPaidBy
      )
    }

    if (hasReturn && returnTrip.legs.length > 0) {
      returnCalc = calculateCosts(
        parseFloat(returnCost),
        returnTrip.legs,
        participants,
        returnPaidBy
      )
    }

    const combined = combineCalculations(
      outboundCalc,
      returnCalc,
      participants
    )

    setFullCalculation(combined)
    setCurrentStep(4)
  }

  const handleReset = () => {
    setCurrentStep(1)
    setOutboundCost('')
    setReturnCost('')
    setOutboundPaidBy('')
    setReturnPaidBy('')
    setParticipants([])
    setOutboundTrip({ stops: [], legs: [], cost: '', paidBy: '' })
    setReturnTrip({ stops: [], legs: [], cost: '', paidBy: '' })
    setFullCalculation(null)
  }

  const steps = t('steps') as readonly string[]

  return (
    <div className="relative min-h-screen overflow-hidden bg-background gradient-subtle">
      <div className="pointer-events-none absolute -left-24 top-28 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-64 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />

      <header className="sticky top-0 z-10 border-b border-border/70 bg-background/80 backdrop-blur-lg">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-primary/20">
                <Car className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{t('appName') as string}</h1>
                <p className="text-[11px] text-muted-foreground">{t('smartAssistantLabel') as string}</p>
              </div>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main className="container py-6 pb-20">
        <div className="mx-auto max-w-md">
          <div className="mb-6 rounded-2xl border border-primary/20 bg-card/90 p-4 shadow-[0_12px_30px_hsl(var(--primary)/0.09)] backdrop-blur-xl">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="mb-1 text-sm font-semibold">
                  {t('introTitle') as string}
                </h2>
                <p className="text-xs text-muted-foreground">
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

          <div className="rounded-3xl border border-border/70 bg-card/90 p-6 shadow-[0_18px_44px_hsl(var(--primary)/0.10)] backdrop-blur-xl">
            {currentStep === 1 && (
              <ParticipantsStep
                participants={participants}
                onParticipantsChange={setParticipants}
                onNext={() => setCurrentStep(2)}
                onBack={() => { }}
              />
            )}

            {currentStep === 2 && (
              <TotalCostStep
                outboundCost={outboundCost}
                returnCost={returnCost}
                outboundPaidBy={outboundPaidBy}
                returnPaidBy={returnPaidBy}
                participants={participants}
                onOutboundCostChange={setOutboundCost}
                onReturnCostChange={setReturnCost}
                onOutboundPaidByChange={setOutboundPaidBy}
                onReturnPaidByChange={setReturnPaidBy}
                onNext={() => {
                  initializeTrips()
                  setCurrentStep(3)
                }}
                onBack={() => setCurrentStep(1)}
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
                onApplyReverseReturn={applyReverseRouteToReturn}
                onNext={handleCalculate}
                onBack={() => setCurrentStep(2)}
              />
            )}

            {currentStep === 4 && fullCalculation && (
              <ResultStep
                fullCalculation={fullCalculation}
                participants={participants}
                settlements={calculateSettlements(
                  fullCalculation,
                  participants
                )}
                onBack={() => setCurrentStep(3)}
                onReset={handleReset}
              />
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t('tagline') as string}
          </p>
        </div>
      </main>
    </div>
  )
}

export default Index
