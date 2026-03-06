import { useLanguage } from '@/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  const baseButton =
    'h-8 w-8 rounded-full p-0 text-base transition-all sm:h-9 sm:w-9'

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/80 p-1 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('pt-BR')}
        aria-label="Português (Brasil)"
        title="Português (Brasil)"
        className={cn(
          baseButton,
          language === 'pt-BR'
            ? 'scale-105 bg-primary/90 text-primary-foreground shadow-md hover:bg-primary/90'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        🇧🇷
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('en-US')}
        aria-label="English (US)"
        title="English (US)"
        className={cn(
          baseButton,
          language === 'en-US'
            ? 'scale-105 bg-primary/90 text-primary-foreground shadow-md hover:bg-primary/90'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        🇺🇸
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('es-ES')}
        aria-label="Español"
        title="Español"
        className={cn(
          baseButton,
          language === 'es-ES'
            ? 'scale-105 bg-primary/90 text-primary-foreground shadow-md hover:bg-primary/90'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        🇪🇸
      </Button>
    </div>
  )
}
