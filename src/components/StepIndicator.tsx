import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  labels: string[]
}

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="mb-6 overflow-x-auto pb-1">
      <div className="flex min-w-max items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNumber = i + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep

          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{ scale: isCurrent ? 1.06 : 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-accent text-accent-foreground ring-4 ring-accent/20',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                </motion.div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {labels[i]}
                </span>
              </div>

              {i < totalSteps - 1 && (
                <div className="mx-2 h-0.5 w-8 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{ width: stepNumber < currentStep ? '100%' : '0%' }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="h-full bg-primary"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
