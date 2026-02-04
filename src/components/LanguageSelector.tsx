import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-muted rounded-full p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('pt-BR')}
        className={cn(
          "h-7 px-2 text-xs font-medium rounded-full transition-all",
          language === 'pt-BR' 
            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        PT
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('en-US')}
        className={cn(
          "h-7 px-2 text-xs font-medium rounded-full transition-all",
          language === 'en-US' 
            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </Button>
    </div>
  );
}
