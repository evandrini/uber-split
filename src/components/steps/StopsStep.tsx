import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Plus, Trash2, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Stop, Participant, Leg, TripData } from '@/types/ride';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

interface StopsStepProps {
  hasOutbound: boolean;
  hasReturn: boolean;
  outboundTrip: TripData;
  returnTrip: TripData;
  participants: Participant[];
  onOutboundChange: (trip: TripData) => void;
  onReturnChange: (trip: TripData) => void;
  onNext: () => void;
  onBack: () => void;
}

function TripStopsEditor({
  trip,
  participants,
  onChange,
  isReturn,
}: {
  trip: TripData;
  participants: Participant[];
  onChange: (trip: TripData) => void;
  isReturn: boolean;
}) {
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const { t } = useLanguage();

  const addStop = () => {
    const newStop: Stop = {
      id: crypto.randomUUID(),
      name: '',
      address: '',
      entering: trip.stops.length === 0 ? participants.map(p => p.id) : [],
      exiting: [],
    };
    const newStops = [...trip.stops, newStop];
    onChange({ ...trip, stops: newStops });
    setExpandedStop(newStop.id);
  };

  const removeStop = (id: string) => {
    onChange({ ...trip, stops: trip.stops.filter(s => s.id !== id) });
  };

  const updateStop = (id: string, updates: Partial<Stop>) => {
    onChange({
      ...trip,
      stops: trip.stops.map(s => (s.id === id ? { ...s, ...updates } : s)),
    });
  };

  const updateLegDistance = (index: number, distance: string) => {
    const newLegs = [...trip.legs];
    newLegs[index] = { ...newLegs[index], distance: parseFloat(distance) || 0 };
    onChange({ ...trip, legs: newLegs });
  };

  const toggleEntering = (stopId: string, participantId: string) => {
    const stop = trip.stops.find(s => s.id === stopId);
    if (!stop) return;

    const entering = stop.entering.includes(participantId)
      ? stop.entering.filter(id => id !== participantId)
      : [...stop.entering, participantId];

    updateStop(stopId, { entering });
  };

  const toggleExiting = (stopId: string, participantId: string) => {
    const stop = trip.stops.find(s => s.id === stopId);
    if (!stop) return;

    const exiting = stop.exiting.includes(participantId)
      ? stop.exiting.filter(id => id !== participantId)
      : [...stop.exiting, participantId];

    updateStop(stopId, { exiting });
  };

  return (
    <div className="space-y-3">
      {trip.stops.map((stop, index) => (
        <div key={stop.id} className="animate-slide-in">
          <div
            className={cn(
              "bg-muted/50 rounded-lg overflow-hidden transition-all",
              expandedStop === stop.id && "ring-1 ring-primary/20"
            )}
          >
            <div
              className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 cursor-pointer"
              onClick={() => setExpandedStop(expandedStop === stop.id ? null : stop.id)}
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold",
                    index === 0
                      ? "bg-success text-success-foreground"
                      : index === trip.stops.length - 1
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {index + 1}
                </div>
                {index < trip.stops.length - 1 && (
                  <div className="w-0.5 h-3 sm:h-4 bg-border mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  placeholder={
                    index === 0
                      ? t('origin') as string
                      : index === trip.stops.length - 1
                      ? t('finalDestination') as string
                      : t('intermediateStop') as string
                  }
                  value={stop.address}
                  onChange={e => {
                    e.stopPropagation();
                    updateStop(stop.id, { address: e.target.value, name: e.target.value });
                  }}
                  onClick={e => e.stopPropagation()}
                  className="border-0 bg-transparent focus-visible:ring-0 p-0 text-sm sm:text-base font-medium h-8"
                />
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {trip.stops.length > 2 && index > 0 && index < trip.stops.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={e => {
                      e.stopPropagation();
                      removeStop(stop.id);
                    }}
                    className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                )}
                {expandedStop === stop.id ? (
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {expandedStop === stop.id && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4 border-t border-border pt-3 sm:pt-4 animate-fade-in">
                {index > 0 && (
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 block">
                      {t('whoExitsHere') as string}
                    </Label>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {participants.map(p => (
                        <label
                          key={p.id}
                          className={cn(
                            "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border cursor-pointer transition-all text-xs sm:text-sm",
                            stop.exiting.includes(p.id)
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border hover:border-accent/50"
                          )}
                        >
                          <Checkbox
                            checked={stop.exiting.includes(p.id)}
                            onCheckedChange={() => toggleExiting(stop.id, p.id)}
                          />
                          <span className="font-medium">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {index < trip.stops.length - 1 && (
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 block">
                      {t('whoEntersHere') as string}
                    </Label>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {participants.map(p => (
                        <label
                          key={p.id}
                          className={cn(
                            "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border cursor-pointer transition-all text-xs sm:text-sm",
                            stop.entering.includes(p.id)
                              ? "border-success bg-success/10 text-success"
                              : "border-border hover:border-success/50"
                          )}
                        >
                          <Checkbox
                            checked={stop.entering.includes(p.id)}
                            onCheckedChange={() => toggleEntering(stop.id, p.id)}
                          />
                          <span className="font-medium">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Distance input between stops */}
          {index < trip.stops.length - 1 && (
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2">
              <div className="w-7 sm:w-8" />
              <div className="flex items-center gap-2 flex-1">
                <div className="h-px flex-1 bg-border" />
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-muted rounded-full">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={trip.legs[index]?.distance || ''}
                    onChange={e => updateLegDistance(index, e.target.value)}
                    className="w-12 sm:w-16 h-6 sm:h-7 text-center border-0 bg-transparent p-0 text-xs sm:text-sm font-semibold"
                  />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">km</span>
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}
        </div>
      ))}

      <Button
        variant="outline"
        onClick={addStop}
        className="w-full h-10 sm:h-12 border-dashed text-sm sm:text-base"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        {t('addStop') as string}
      </Button>
    </div>
  );
}

export function StopsStep({
  hasOutbound,
  hasReturn,
  outboundTrip,
  returnTrip,
  participants,
  onOutboundChange,
  onReturnChange,
  onNext,
  onBack,
}: StopsStepProps) {
  const { t } = useLanguage();
  const hasBothTrips = hasOutbound && hasReturn;

  const isOutboundValid = !hasOutbound || (outboundTrip.stops.length >= 2 && outboundTrip.legs.every(leg => leg.distance > 0));
  const isReturnValid = !hasReturn || (returnTrip.stops.length >= 2 && returnTrip.legs.every(leg => leg.distance > 0));
  const isValid = isOutboundValid && isReturnValid;

  const showMinStopsMessage = 
    (hasOutbound && outboundTrip.stops.length < 2) || 
    (hasReturn && returnTrip.stops.length < 2);

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-4 sm:mb-6">
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl gradient-primary flex items-center justify-center">
          <MapPin className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">
          {t('stopsTitle') as string}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          {t('stopsSubtitle') as string}
        </p>
      </div>

      {hasBothTrips ? (
        <Tabs defaultValue="outbound" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="outbound" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('outboundTrip') as string}
            </TabsTrigger>
            <TabsTrigger value="return" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('returnTrip') as string}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="outbound">
            <TripStopsEditor
              trip={outboundTrip}
              participants={participants}
              onChange={onOutboundChange}
              isReturn={false}
            />
          </TabsContent>
          <TabsContent value="return">
            <TripStopsEditor
              trip={returnTrip}
              participants={participants}
              onChange={onReturnChange}
              isReturn={true}
            />
          </TabsContent>
        </Tabs>
      ) : hasOutbound ? (
        <TripStopsEditor
          trip={outboundTrip}
          participants={participants}
          onChange={onOutboundChange}
          isReturn={false}
        />
      ) : (
        <TripStopsEditor
          trip={returnTrip}
          participants={participants}
          onChange={onReturnChange}
          isReturn={true}
        />
      )}

      {showMinStopsMessage && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center mt-3 sm:mt-4">
          {t('minStops') as string}
        </p>
      )}

      <div className="flex gap-2 sm:gap-3 pt-4 sm:pt-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          {t('back') as string}
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 h-10 sm:h-12 gradient-primary text-sm sm:text-base"
        >
          {t('calculate') as string}
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
