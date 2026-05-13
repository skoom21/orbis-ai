'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Detection ─────────────────────────────────────────────────────────────────

const FLIGHT_DATE_PATTERNS = [
  /what.*departure date/i,
  /when.*fly/i,
  /when would you like to (fly|depart|travel)/i,
  /departure date/i,
  /what dates.*flight/i,
]

const HOTEL_DATE_PATTERNS = [
  /check.?in.*date/i,
  /when.*check in/i,
  /what.*dates.*hotel/i,
  /hotel.*what.*dates/i,
  /arrival.*date/i,
]

const PASSENGER_PATTERNS = [
  /how many (passengers|travelers|adults|guests|people)/i,
  /number of (passengers|travelers|adults|guests)/i,
  /how many.*travel/i,
]

// NOTE: The trip-planner pattern has been intentionally removed.
// Agents now emit an explicit ```form block when they need structured input,
// which is rendered by DynamicTravelForm in content-parts.tsx.
// This fallback only handles the narrow, unambiguous cases where
// the agent asks for dates or passenger count in plain text.

export type InlineFormType = 'flight-dates' | 'hotel-dates' | 'passengers' | 'trip-planner' | null

export function detectInlineFormType(message: string): InlineFormType {
  // Guard: don't show any inline form when the message contains a ```form block
  // (those are rendered inline by DynamicTravelForm) or search results.
  if (/```form/i.test(message)) return null

  const hasFlightResults = (
    /✈️\s*\*\*/.test(message) ||
    /Duration:\s*\d+h/i.test(message) ||
    /\d+ stop(s)? via/i.test(message) ||
    /\d\.\s+.{0,40}→.{0,40}\$\d+/.test(message)
  )
  const hasHotelResults = (
    /🏨\s*\*\*/.test(message) ||
    /per night|\/ ?night/i.test(message)
  )
  const hasManyPrices = (message.match(/\$\d[\d,]+/g) || []).length >= 3
  if (hasFlightResults || hasHotelResults || hasManyPrices) return null

  if (FLIGHT_DATE_PATTERNS.some((p) => p.test(message))) return 'flight-dates'
  if (HOTEL_DATE_PATTERNS.some((p) => p.test(message))) return 'hotel-dates'
  if (PASSENGER_PATTERNS.some((p) => p.test(message))) return 'passengers'
  return null
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDateDisplay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Interest options ──────────────────────────────────────────────────────────

const INTERESTS = [
  { id: 'food',       label: 'Food & Cuisine',    emoji: '🍜' },
  { id: 'history',    label: 'History & Culture',  emoji: '🏛️' },
  { id: 'markets',    label: 'Markets & Shopping', emoji: '🛍️' },
  { id: 'adventure',  label: 'Adventure & Hiking', emoji: '🧗' },
  { id: 'nature',     label: 'Nature & Scenery',   emoji: '🌿' },
  { id: 'nightlife',  label: 'Nightlife',          emoji: '🌃' },
  { id: 'art',        label: 'Art & Museums',      emoji: '🎨' },
  { id: 'religious',  label: 'Religious Sites',    emoji: '🕌' },
  { id: 'beaches',    label: 'Beaches',            emoji: '🏖️' },
  { id: 'sports',     label: 'Sports',             emoji: '⚽' },
]

// ── Components ────────────────────────────────────────────────────────────────

interface InlineTravelFormProps {
  type: Exclude<InlineFormType, null>
  onSubmit: (message: string) => void
  className?: string
}

export function InlineTravelForm({ type, onSubmit, className }: InlineTravelFormProps) {
  const today = todayStr()

  // Shared
  const [passengers, setPassengers] = useState(1)

  // Flight
  const [depDate, setDepDate] = useState(addDays(today, 7))
  const [retDate, setRetDate] = useState(addDays(today, 14))
  const [isOneWay, setIsOneWay] = useState(false)

  // Hotel
  const [checkin, setCheckin] = useState(addDays(today, 7))
  const [checkout, setCheckout] = useState(addDays(today, 10))

  // Trip planner
  const [days, setDays] = useState(5)
  const [startDate, setStartDate] = useState(addDays(today, 14))
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set())

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = () => {
    if (type === 'flight-dates') {
      const msg = isOneWay
        ? `Departure: ${formatDateDisplay(depDate)}, one-way, ${passengers} passenger${passengers > 1 ? 's' : ''}.`
        : `Departure: ${formatDateDisplay(depDate)}, return: ${formatDateDisplay(retDate)}, ${passengers} passenger${passengers > 1 ? 's' : ''}.`
      onSubmit(msg)
    } else if (type === 'hotel-dates') {
      const nights = Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
      onSubmit(`Check-in: ${formatDateDisplay(checkin)}, check-out: ${formatDateDisplay(checkout)} (${nights} night${nights !== 1 ? 's' : ''}), ${passengers} guest${passengers > 1 ? 's' : ''}.`)
    } else if (type === 'passengers') {
      onSubmit(`${passengers} passenger${passengers > 1 ? 's' : ''}.`)
    } else if (type === 'trip-planner') {
      const endDate = addDays(startDate, days - 1)
      const interestLabels = INTERESTS
        .filter((i) => selectedInterests.has(i.id))
        .map((i) => i.label)
      const interestText = interestLabels.length > 0
        ? `I'm interested in: ${interestLabels.join(', ')}.`
        : 'No specific interests — open to anything.'
      onSubmit(
        `I plan to spend ${days} day${days !== 1 ? 's' : ''}, travelling from ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}, with ${passengers} traveller${passengers !== 1 ? 's' : ''}. ${interestText}`
      )
    }
  }

  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-1 duration-200',
        className,
      )}
    >
      {type === 'flight-dates' && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <DateField label="Departure" value={depDate} min={today} onChange={setDepDate} />
            {!isOneWay && (
              <DateField label="Return" value={retDate} min={depDate} onChange={setRetDate} />
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isOneWay}
                onChange={(e) => setIsOneWay(e.target.checked)}
                className="rounded"
              />
              One-way
            </label>
            <PassengerStepper value={passengers} onChange={setPassengers} />
          </div>
        </>
      )}

      {type === 'hotel-dates' && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <DateField label="Check-in" value={checkin} min={today} onChange={(v) => { setCheckin(v); if (v >= checkout) setCheckout(addDays(v, 1)) }} />
            <DateField label="Check-out" value={checkout} min={addDays(checkin, 1)} onChange={setCheckout} />
          </div>

          <div className="flex justify-end mb-1">
            <PassengerStepper value={passengers} onChange={setPassengers} label="Guests" />
          </div>
        </>
      )}

      {type === 'passengers' && (
        <>
          <div className="flex justify-center mb-4">
            <PassengerStepper value={passengers} onChange={setPassengers} large />
          </div>
        </>
      )}

      {type === 'trip-planner' && (
        <>
          {/* Row 1: Duration + travellers */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Duration</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDays(Math.max(1, days - 1))}
                  className="h-8 w-8 rounded-full border border-border/60 bg-muted/40 text-foreground hover:bg-muted transition-colors flex items-center justify-center text-sm font-bold shrink-0"
                >
                  −
                </button>
                <span className="flex-1 text-center text-sm font-semibold tabular-nums">
                  {days} {days === 1 ? 'day' : 'days'}
                </span>
                <button
                  type="button"
                  onClick={() => setDays(Math.min(30, days + 1))}
                  className="h-8 w-8 rounded-full border border-border/60 bg-muted/40 text-foreground hover:bg-muted transition-colors flex items-center justify-center text-sm font-bold shrink-0"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Travellers</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPassengers(Math.max(1, passengers - 1))}
                  className="h-8 w-8 rounded-full border border-border/60 bg-muted/40 text-foreground hover:bg-muted transition-colors flex items-center justify-center text-sm font-bold shrink-0"
                >
                  −
                </button>
                <span className="flex-1 text-center text-sm font-semibold tabular-nums">
                  {passengers}
                </span>
                <button
                  type="button"
                  onClick={() => setPassengers(Math.min(12, passengers + 1))}
                  className="h-8 w-8 rounded-full border border-border/60 bg-muted/40 text-foreground hover:bg-muted transition-colors flex items-center justify-center text-sm font-bold shrink-0"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Start date */}
          <div className="mb-4">
            <DateField
              label="Start date"
              value={startDate}
              min={today}
              onChange={setStartDate}
            />
            {days > 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Ends {formatDateDisplay(addDays(startDate, days - 1))}
              </p>
            )}
          </div>

          {/* Row 3: Interests */}
          <div className="mb-4">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground block mb-2">
              Interests <span className="normal-case font-normal">(pick any)</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {INTERESTS.map((interest) => {
                const active = selectedInterests.has(interest.id)
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                      active
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : 'border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:text-foreground',
                    )}
                  >
                    <span>{interest.emoji}</span>
                    {interest.label}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      <Button
        className="w-full rounded-xl h-10 gap-2 text-sm font-medium"
        onClick={handleSubmit}
      >
        Confirm
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function DateField({ label, value, min, onChange }: { label: string; value: string; min: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{label}</label>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 scheme-dark"
      />
    </div>
  )
}

function PassengerStepper({
  value,
  onChange,
  label = 'Passengers',
  large,
}: {
  value: number
  onChange: (v: number) => void
  label?: string
  large?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-2', large && 'scale-125 origin-center')}>
      <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mr-1">{label}</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="h-7 w-7 rounded-full border border-border/60 bg-muted/40 text-foreground hover:bg-muted transition-colors flex items-center justify-center text-sm font-bold"
      >
        −
      </button>
      <span className="w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(12, value + 1))}
        className="h-7 w-7 rounded-full border border-border/60 bg-muted/40 text-foreground hover:bg-muted transition-colors flex items-center justify-center text-sm font-bold"
      >
        +
      </button>
    </div>
  )
}
