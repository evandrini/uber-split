import { useLanguage } from '@/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const flags = {
  'pt-BR': `${import.meta.env.BASE_URL}flags/br.svg`,
  'en-US': `${import.meta.env.BASE_URL}flags/us.svg`,
  'es-ES': `${import.meta.env.BASE_URL}flags/es.svg`,
} as const

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  const baseButton =
    'h-8 w-8 rounded-full p-0 transition-all sm:h-9 sm:w-9 overflow-hidden'

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
            ? 'scale-105 ring-2 ring-primary/40 shadow-md'
            : 'opacity-85 hover:scale-105 hover:opacity-100'
        )}
      >
        <img src={flags['pt-BR']} alt="Brasil" className="h-full w-full object-cover" draggable={false} />
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
            ? 'scale-105 ring-2 ring-primary/40 shadow-md'
            : 'opacity-85 hover:scale-105 hover:opacity-100'
        )}
      >
        <img src={flags['en-US']} alt="United States" className="h-full w-full object-cover" draggable={false} />
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
            ? 'scale-105 ring-2 ring-primary/40 shadow-md'
            : 'opacity-85 hover:scale-105 hover:opacity-100'
        )}
      >
        <img src={flags['es-ES']} alt="España" className="h-full w-full object-cover" draggable={false} />
      </Button>
    </div>
  )
}