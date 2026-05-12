'use client'

import { Plane, Hotel, MapPin, X, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TripContextState {
  destination?: string
  dates?: string
  flightLabel?: string
  flightPrice?: number
  hotelLabel?: string
  hotelPrice?: number
  currency?: string
}

interface TripContextStripProps {
  state: TripContextState
  onClear?: () => void
  className?: string
}

function formatPrice(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `$${amount}`
  }
}

export function TripContextStrip({ state, onClear, className }: TripContextStripProps) {
  const hasAny = state.destination || state.flightLabel || state.hotelLabel || state.dates

  if (!hasAny) return null

  const total = (state.flightPrice ?? 0) + (state.hotelPrice ?? 0)

  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-x-auto px-4 py-2 border-b border-border/40 bg-muted/30 backdrop-blur-sm',
        'text-xs text-muted-foreground',
        className,
      )}
      style={{ scrollbarWidth: 'none' }}
      aria-label="Current trip context"
    >
      {/* Destination */}
      {state.destination && (
        <Pill icon={<MapPin className="h-3 w-3" />} label={state.destination} color="text-emerald-500" />
      )}

      {/* Dates */}
      {state.dates && (
        <Pill icon={<span className="text-[10px]">📅</span>} label={state.dates} />
      )}

      {state.destination && (state.flightLabel || state.hotelLabel) && (
        <Divider />
      )}

      {/* Flight */}
      {state.flightLabel && (
        <Pill icon={<Plane className="h-3 w-3 -rotate-45" />} label={state.flightLabel} color="text-sky-500" />
      )}

      {/* Hotel */}
      {state.hotelLabel && (
        <Pill icon={<Hotel className="h-3 w-3" />} label={state.hotelLabel} color="text-amber-500" />
      )}

      {/* Running total */}
      {total > 0 && (
        <>
          <Divider />
          <Pill
            icon={<DollarSign className="h-3 w-3" />}
            label={`${formatPrice(total, state.currency)} total`}
            color="text-primary"
            bold
          />
        </>
      )}

      {/* Clear */}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto shrink-0 rounded-full p-0.5 hover:bg-muted/80 transition-colors text-muted-foreground/60 hover:text-foreground"
          aria-label="Clear trip context"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

function Pill({
  icon,
  label,
  color,
  bold,
}: {
  icon: React.ReactNode
  label: string
  color?: string
  bold?: boolean
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 shrink-0 rounded-full border border-border/50 bg-background/60 px-2.5 py-1',
        color,
        bold && 'font-semibold',
      )}
    >
      {icon}
      <span className="max-w-[160px] truncate">{label}</span>
    </div>
  )
}

function Divider() {
  return <div className="h-3 w-px shrink-0 bg-border/60" />
}
