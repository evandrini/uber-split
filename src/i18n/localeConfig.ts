import type { Language } from './translations'

type LocaleConfig = {
  locale: string
  currency: 'BRL' | 'USD' | 'EUR' | 'CNY'
  currencySymbol: string
  decimalExample: string
  ogLocale: string
}

const localeConfigByLanguage: Record<Language, LocaleConfig> = {
  'pt-BR': {
    locale: 'pt-BR',
    currency: 'BRL',
    currencySymbol: 'R$',
    decimalExample: '0,00',
    ogLocale: 'pt_BR',
  },
  'en-US': {
    locale: 'en-US',
    currency: 'USD',
    currencySymbol: '$',
    decimalExample: '0.00',
    ogLocale: 'en_US',
  },
  'es-ES': {
    locale: 'es-ES',
    currency: 'EUR',
    currencySymbol: '€',
    decimalExample: '0,00',
    ogLocale: 'es_ES',
  },
  'zh-CN': {
    locale: 'zh-CN',
    currency: 'CNY',
    currencySymbol: '¥',
    decimalExample: '0.00',
    ogLocale: 'zh_CN',
  },
}

export function getLocaleConfig(language: Language): LocaleConfig {
  return localeConfigByLanguage[language]
}
