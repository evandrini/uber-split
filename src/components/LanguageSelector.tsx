import { Button } from '@/components/ui/button'
import { useLanguage } from '@/i18n/LanguageContext'
import type { Language } from '@/i18n/translations'
import { cn } from '@/lib/utils'

const languages: Array<{ code: Language; label: string; flag: string; alt: string }> = [
  { code: 'pt-BR', label: 'Português (Brasil)', flag: 'br', alt: 'Brasil' },
  { code: 'en-US', label: 'English (US)', flag: 'us', alt: 'United States' },
  { code: 'es-ES', label: 'Español', flag: 'es', alt: 'España' },
  { code: 'zh-CN', label: '简体中文', flag: 'cn', alt: '中国' },
]

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()
  const baseButton =
    'h-8 w-8 overflow-hidden rounded-full p-0 transition-all sm:h-9 sm:w-9'

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/80 p-1 backdrop-blur-sm">
      {languages.map(option => (
        <Button
          key={option.code}
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(option.code)}
          aria-label={option.label}
          title={option.label}
          className={cn(
            baseButton,
            language === option.code
              ? 'scale-105 ring-2 ring-primary/40 shadow-md'
              : 'opacity-85 hover:scale-105 hover:opacity-100',
          )}
        >
          <img
            src={`${import.meta.env.BASE_URL}flags/${option.flag}.svg`}
            alt={option.alt}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </Button>
      ))}
    </div>
  )
}
