'use client'

import { useState } from 'react'
import { MapPin, Wallet, Compass, ChevronRight, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'

interface Step {
  id: number
  icon: React.ReactNode
  title: string
  subtitle: string
}

const STEPS: Step[] = [
  { id: 1, icon: <MapPin className="h-5 w-5" />, title: 'Where are you based?', subtitle: 'We\'ll default searches from your home airport.' },
  { id: 2, icon: <Wallet className="h-5 w-5" />, title: 'What\'s your travel budget?', subtitle: 'Per trip — helps us suggest the right options.' },
  { id: 3, icon: <Compass className="h-5 w-5" />, title: 'How do you like to travel?', subtitle: 'Pick everything that fits you.' },
]

const BUDGET_OPTIONS = [
  { label: 'Budget', sub: 'Under $1,000', min: 0, max: 1000 },
  { label: 'Mid-range', sub: '$1,000 – $3,000', min: 1000, max: 3000 },
  { label: 'Premium', sub: '$3,000 – $7,000', min: 3000, max: 7000 },
  { label: 'Luxury', sub: '$7,000+', min: 7000, max: 50000 },
]

const STYLE_OPTIONS = [
  { value: 'adventure', emoji: '🧗', label: 'Adventure' },
  { value: 'cultural', emoji: '🏛️', label: 'Cultural' },
  { value: 'relaxation', emoji: '🌴', label: 'Relaxation' },
  { value: 'business', emoji: '💼', label: 'Business' },
  { value: 'family', emoji: '👨‍👩‍👧', label: 'Family' },
  { value: 'romantic', emoji: '💑', label: 'Romantic' },
  { value: 'solo', emoji: '🎒', label: 'Solo' },
]

interface PreferenceOnboardingProps {
  onComplete: () => void
}

export function PreferenceOnboarding({ onComplete }: PreferenceOnboardingProps) {
  const [step, setStep] = useState(1)
  const [homeCity, setHomeCity] = useState('')
  const [budget, setBudget] = useState<typeof BUDGET_OPTIONS[0] | null>(null)
  const [styles, setStyles] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const toggleStyle = (val: string) => {
    setStyles((prev) => prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val])
  }

  const canAdvance = () => {
    if (step === 1) return homeCity.trim().length > 1
    if (step === 2) return budget !== null
    if (step === 3) return styles.length > 0
    return false
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      await apiClient.updatePreferences({
        travel_style: styles,
        typical_trip_budget_min: budget?.min,
        typical_trip_budget_max: budget?.max,
        preference_text: `Based in ${homeCity}. Enjoys ${styles.join(', ')} travel. Budget: ${budget?.label}.`,
      })
    } catch {
      // Silently continue — preferences are nice-to-have, not blocking
    } finally {
      setSaving(false)
      onComplete()
    }
  }

  const advance = () => {
    if (step < 3) setStep((s) => s + 1)
    else handleFinish()
  }

  return (
    <div className="flex w-full flex-col items-center justify-center px-4 py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              s.id === step ? 'w-8 bg-primary' : s.id < step ? 'w-4 bg-primary/40' : 'w-4 bg-border',
            )}
          />
        ))}
      </div>

      {/* Icon */}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {STEPS[step - 1].icon}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2 text-center">
        {STEPS[step - 1].title}
      </h2>
      <p className="text-sm text-muted-foreground mb-8 text-center max-w-xs">
        {STEPS[step - 1].subtitle}
      </p>

      {/* Step content */}
      <div className="w-full max-w-xs space-y-3">
        {step === 1 && (
          <input
            type="text"
            placeholder="e.g. Karachi, London, New York…"
            value={homeCity}
            onChange={(e) => setHomeCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canAdvance() && advance()}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            autoFocus
          />
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-2.5">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setBudget(opt)}
                className={cn(
                  'flex flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200',
                  budget?.label === opt.label
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/60 bg-card hover:border-border',
                )}
              >
                <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{opt.sub}</span>
                {budget?.label === opt.label && (
                  <Check className="h-3.5 w-3.5 text-primary mt-2" />
                )}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleStyle(opt.value)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200',
                  styles.includes(opt.value)
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border/60 bg-card text-foreground/80 hover:border-border',
                )}
              >
                <span>{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <Button
        className="mt-8 rounded-full h-11 px-8 gap-2 shadow-lg shadow-primary/20"
        onClick={advance}
        disabled={!canAdvance() || saving}
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
        ) : step < 3 ? (
          <>Continue <ChevronRight className="h-4 w-4" /></>
        ) : (
          <>Start exploring <ChevronRight className="h-4 w-4" /></>
        )}
      </Button>

      <button
        type="button"
        onClick={onComplete}
        className="mt-3 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        Skip for now
      </button>
    </div>
  )
}
