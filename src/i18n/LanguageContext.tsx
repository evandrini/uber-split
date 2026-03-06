import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language, TranslationKey } from './translations'
import { translations } from './translations'
import { getLocaleConfig } from './localeConfig'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string | readonly string[]
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const APP_URL = 'https://evandrini.github.io/uber-split/'

function normalizeLanguage(value: string | null | undefined): Language | null {
  if (!value) return null

  if (value === 'pt-BR' || value === 'en-US' || value === 'es-ES') {
    return value
  }

  const lower = value.toLowerCase()

  if (lower.startsWith('pt')) return 'pt-BR'
  if (lower.startsWith('en')) return 'en-US'
  if (lower.startsWith('es')) return 'es-ES'

  return null
}

function upsertMeta(property: string, content: string, attr: 'name' | 'property' = 'name') {
  if (typeof document === 'undefined') return

  let element = document.head.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, property)
    document.head.appendChild(element)
  }

  element.content = content
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const queryLang = typeof window !== 'undefined'
      ? normalizeLanguage(new URLSearchParams(window.location.search).get('lang'))
      : null

    if (queryLang) return queryLang

    const saved = normalizeLanguage(localStorage.getItem('ubersplit-language'))
    if (saved) return saved

    const browser = normalizeLanguage(navigator.language)
    return browser ?? 'pt-BR'
  })

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('ubersplit-language', lang)

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('lang', lang)
      window.history.replaceState({}, '', url.toString())
    }
  }

  useEffect(() => {
    if (typeof document === 'undefined') return

    const copy = translations[language]
    const locale = getLocaleConfig(language)

    document.documentElement.lang = language
    document.title = copy.seoTitle

    upsertMeta('description', copy.seoDescription)
    upsertMeta('keywords', copy.seoKeywords)

    upsertMeta('og:title', copy.seoTitle, 'property')
    upsertMeta('og:description', copy.seoDescription, 'property')
    upsertMeta('og:locale', locale.ogLocale, 'property')

    upsertMeta('twitter:title', copy.seoTitle)
    upsertMeta('twitter:description', copy.seoDescription)

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = `${APP_URL}?lang=${language}`
  }, [language])

  const t = (key: TranslationKey): string | readonly string[] => {
    return translations[language][key]
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
