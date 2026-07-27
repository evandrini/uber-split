import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, ArrowRight, Car, CheckCircle2, HelpCircle, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/i18n/LanguageContext'
import { getDemoScenario } from '@/utils/demoScenario'

const carPositions = [
  { left: '4%', top: '78%' },
  { left: '24%', top: '45%' },
  { left: '49%', top: '56%' },
  { left: '71%', top: '20%' },
  { left: '88%', top: '16%' },
]

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const { t, language } = useLanguage()
  const reduceMotion = useReducedMotion()
  const scenario = useMemo(() => getDemoScenario(language), [language])
  const [stage, setStage] = useState(reduceMotion ? 7 : 0)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)

  useEffect(() => {
    setStage(reduceMotion ? 7 : 0)
  }, [language, reduceMotion])

  useEffect(() => {
    const handleVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    if (reduceMotion || !pageVisible) return
    const delay = stage === 7 ? 3200 : stage >= 4 ? 1900 : 1600
    const timer = window.setTimeout(() => setStage(current => (current + 1) % 8), delay)
    return () => window.clearTimeout(timer)
  }, [stage, reduceMotion, pageVisible])

  const activeStop = reduceMotion ? 4 : Math.min(stage, 4)
  const peopleCount = Math.min(activeStop + 1, 4)
  const names = [scenario.payerName, ...scenario.passengerNames]
  const status = activeStop === 0
    ? `${scenario.payerName} ${scenario.started}`
    : activeStop < 4
      ? `${names[activeStop]} ${scenario.entered} · ${peopleCount} ${scenario.peopleInCar}`
      : `${scenario.rideFinished} · ${scenario.totalLabel}: ${scenario.formatCurrency(80)}`
  const comparisonStage = reduceMotion ? 7 : stage

  return (
    <section data-testid="welcome-screen" className="relative isolate w-full min-w-0 max-w-full overflow-hidden rounded-[2rem] border border-white/40 bg-card/65 px-5 py-7 shadow-[0_30px_90px_hsl(var(--primary)/0.16)] backdrop-blur-2xl sm:px-9 sm:py-10">
      <div className="pointer-events-none absolute -left-24 top-8 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-4 h-56 w-56 rounded-full bg-orange-400/15 blur-3xl" />

      <div className="relative grid w-full min-w-0 max-w-full items-start gap-7 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-10">
        <div className="min-w-0 max-w-full text-center lg:pt-3 lg:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <Car className="h-3.5 w-3.5" />
            {t('landingEyebrow') as string}
          </div>
          <h2 className="max-w-full text-balance text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {t('landingTitle') as string}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base font-medium leading-relaxed text-foreground/80 lg:mx-0">
            {t('landingSubtitle') as string}
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground lg:mx-0">
            {scenario.story}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-relaxed text-primary lg:mx-0">
            {scenario.solution}
          </p>

          <Button
            onClick={onStart}
            size="lg"
            className="mt-6 h-12 w-full rounded-2xl gradient-primary text-base font-bold shadow-lg shadow-primary/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto sm:min-w-48"
          >
            {t('landingStart') as string}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="relative mx-auto w-full min-w-0 max-w-xl">
          <p className="sr-only">{scenario.accessibilityDescription}</p>
          <div data-testid="demo-card" aria-hidden="true" className="relative w-full min-w-0 max-w-full overflow-hidden rounded-[1.75rem] border border-white/50 bg-slate-950/95 p-4 shadow-2xl dark:border-white/10">
            <div data-testid="demo-status-area" className="mb-3 flex h-6 w-full min-w-0 max-w-full items-center gap-2 overflow-hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
              <span className="shrink-0">{scenario.routePreview}</span>
              <span data-testid="demo-status" className="block min-w-0 flex-1 truncate rounded-full bg-sky-400/15 px-2 py-1 text-right normal-case tracking-normal text-sky-200">{status}</span>
            </div>

            <div className="relative h-48 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,.22),transparent_32%),radial-gradient(circle_at_80%_75%,rgba(251,146,60,.18),transparent_34%),linear-gradient(135deg,#111827,#172033)] sm:h-52">
              <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:28px_28px]" />
              <svg viewBox="0 0 420 210" className="absolute inset-0 h-full w-full">
                <path d="M28 174 C92 174 83 102 124 100 S196 146 230 116 S286 55 315 53 S350 40 390 42" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="10" strokeLinecap="round" />
                <motion.path
                  d="M28 174 C92 174 83 102 124 100 S196 146 230 116 S286 55 315 53 S350 40 390 42"
                  fill="none"
                  stroke="url(#demoRouteGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  animate={{ pathLength: reduceMotion ? 1 : Math.max(0.05, activeStop / 4) }}
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                />
                <defs><linearGradient id="demoRouteGradient"><stop stopColor="#38bdf8" /><stop offset="1" stopColor="#fb923c" /></linearGradient></defs>
              </svg>

              {carPositions.map((position, index) => (
                <motion.div
                  key={scenario.routeStops[index]}
                  className="absolute flex items-center gap-1"
                  style={position}
                  animate={{ opacity: reduceMotion || index <= activeStop ? 1 : 0.3, scale: index === activeStop ? 1.08 : 1 }}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[9px] font-black shadow-lg ${
                    index === 4 ? 'border-orange-300 bg-orange-500 text-white' : 'border-white bg-primary text-white'
                  }`}>{index === 4 ? '★' : index + 1}</span>
                  <span className="max-w-20 truncate rounded-full bg-black/55 px-2 py-1 text-[9px] font-semibold text-white backdrop-blur">{scenario.routeStops[index]}</span>
                </motion.div>
              ))}

              <motion.div
                className="absolute text-xl"
                animate={reduceMotion ? carPositions[4] : carPositions[activeStop]}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
              >
                🚗
              </motion.div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {names.map((name, index) => (
                <div key={name} className="min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-1 text-[9px] text-white/70">
                    <span className="truncate">{name}</span>
                    <span>{[100, 76, 47, 21][index]}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-orange-400"
                      animate={{ width: reduceMotion || activeStop >= index ? `${[100, 76, 47, 21][index]}%` : '0%' }}
                    />
                  </div>
                  <p className="mt-1 truncate text-[8px] text-white/40">{scenario.distanceLabels[index]}</p>
                </div>
              ))}
            </div>

            <div data-testid="demo-comparison" className="mt-3 h-[126px] min-w-0 overflow-hidden">
              <AnimatePresence mode="wait">
                {comparisonStage <= 4 ? (
                  <motion.div key="journey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 text-center text-xs text-white/70">
                    <span className="block min-w-0 max-w-full truncate font-semibold text-white">{status}</span>
                  </motion.div>
                ) : comparisonStage <= 6 ? (
                  <motion.div key="equal" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full min-w-0 overflow-hidden rounded-2xl border border-orange-400/25 bg-orange-400/10 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-200"><AlertTriangle className="h-4 w-4" />{scenario.equalTitle}</div>
                    <p className="mt-2 text-center text-sm font-bold text-white">{scenario.formatCurrency(80)} ÷ 4 = {scenario.formatCurrency(20)} {scenario.equalEach}</p>
                    <p className="mt-1 text-center text-[10px] text-orange-100/70">{scenario.equalWarning}</p>
                  </motion.div>
                ) : (
                  <motion.div key="fair" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="h-full min-w-0 overflow-hidden rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><CheckCircle2 className="h-4 w-4" />{scenario.fairTitle}</div>
                    <p className="mt-2 flex justify-between gap-2 text-[10px] text-white/75">
                      <span>{scenario.payerShare} {scenario.payerName}</span>
                      <strong className="text-white">{scenario.formatCurrency(scenario.proportionalShares[0])}</strong>
                    </p>
                    <div className="mt-1 space-y-1">
                      {scenario.passengerNames.map((name, index) => (
                        <p key={name} className="flex justify-between gap-2 text-[10px] text-white/75">
                          <span className="truncate">{name} {scenario.paysTo} {scenario.payerName}</span>
                          <strong className="text-white">{scenario.formatCurrency(scenario.proportionalShares[index + 1])}</strong>
                        </p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-7 grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-orange-400/15 bg-background/55 p-4 backdrop-blur"><div className="flex gap-3"><HelpCircle className="h-5 w-5 shrink-0 text-orange-500" /><div><h3 className="text-sm font-bold text-foreground">{t('landingProblemTitle') as string}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{scenario.problem}</p></div></div></article>
        <article className="rounded-2xl border border-primary/15 bg-background/55 p-4 backdrop-blur"><div className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /><div><h3 className="text-sm font-bold text-foreground">{t('landingSolutionTitle') as string}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{scenario.solution}</p></div></div></article>
      </div>
      <p className="relative mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground"><Route className="h-3.5 w-3.5" />{t('landingPrivacyNote') as string}</p>
    </section>
  )
}
