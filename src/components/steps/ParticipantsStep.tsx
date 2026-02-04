import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Participant } from '@/types/ride';
import { useLanguage } from '@/i18n/LanguageContext';

interface ParticipantsStepProps {
  participants: Participant[];
  onParticipantsChange: (participants: Participant[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ParticipantsStep({
  participants,
  onParticipantsChange,
  onNext,
}: ParticipantsStepProps) {
  const [newName, setNewName] = useState('');
  const { t } = useLanguage();

  const addParticipant = () => {
    const name = newName.trim() || `${t('participantsTitle').toString().slice(0, -1)} ${participants.length + 1}`;
    onParticipantsChange([
      ...participants,
      { id: crypto.randomUUID(), name },
    ]);
    setNewName('');
  };

  const removeParticipant = (id: string) => {
    onParticipantsChange(participants.filter(p => p.id !== id));
  };

  const updateParticipantName = (id: string, name: string) => {
    onParticipantsChange(
      participants.map(p => (p.id === id ? { ...p, name } : p))
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addParticipant();
    }
  };

  const isValid = participants.length >= 2;

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
          <Users className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('participantsTitle') as string}
        </h2>
        <p className="text-muted-foreground">
          {t('participantsSubtitle') as string}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={t('participantPlaceholder') as string}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={addParticipant}
            className="shrink-0 gradient-primary"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {participants.map((participant, index) => (
            <div
              key={participant.id}
              className="flex items-center gap-2 p-3 bg-card rounded-lg card-shadow animate-slide-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">
                {index + 1}
              </div>
              <Input
                value={participant.name}
                onChange={e => updateParticipantName(participant.id, e.target.value)}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-2"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeParticipant(participant.id)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {participants.length < 2 && (
          <p className="text-sm text-muted-foreground text-center">
            {t('minParticipants') as string}
          </p>
        )}

        <div className="pt-4">
          <Button
            onClick={onNext}
            disabled={!isValid}
            className="w-full h-12 gradient-primary"
          >
            {t('continue') as string}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
