'use client'

import { cn } from '@/lib/utils'
import { Sunrise, Sun, Moon, MapPin, DollarSign, Calendar, Users, Clock } from 'lucide-react'
import type { ParsedItinerary, ItineraryActivity } from './parse-itinerary'

// ── City color palette ─────────────────────────────────────────────────────────

const CITY_PALETTE: Record<string, { from: string; to: string; text: string }> = {
  karachi:  { from: 'from-sky-900/60',     to: 'to-sky-700/40',     text: 'text-sky-300' },
  lahore:   { from: 'from-emerald-900/60', to: 'to-emerald-700/40', text: 'text-emerald-300' },
  islamabad:{ from: 'from-violet-900/60',  to: 'to-violet-700/40',  text: 'text-violet-300' },
  dubai:    { from: 'from-amber-900/60',   to: 'to-amber-700/40',   text: 'text-amber-300' },
  london:   { from: 'from-slate-900/60',   to: 'to-slate-700/40',   text: 'text-slate-300' },
  paris:    { from: 'from-rose-900/60',    to: 'to-rose-700/40',    text: 'text-rose-300' },
  tokyo:    { from: 'from-pink-900/60',    to: 'to-pink-700/40',    text: 'text-pink-300' },
  istanbul: { from: 'from-orange-900/60',  to: 'to-orange-700/40',  text: 'text-orange-300' },
  default:  { from: 'from-primary/20',     to: 'to-primary/10',     text: 'text-primary' },
}

function cityPalette(city?: string) {
  if (!city) return CITY_PALETTE.default
  const key = city.toLowerCase().split(/\s+/)[0]
  return CITY_PALETTE[key] ?? CITY_PALETTE.default
}

// ── Activity icon ──────────────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: ItineraryActivity['type'] }) {
  const cls = 'h-3.5 w-3.5 shrink-0'
  if (type === 'morning')   return <Sunrise className={cn(cls, 'text-amber-400')} />
  if (type === 'afternoon') return <Sun     className={cn(cls, 'text-yellow-400')} />
  if (type === 'evening')   return <Moon    className={cn(cls, 'text-indigo-400')} />
  return <Clock className={cn(cls, 'text-muted-foreground')} />
}

// ── Single day card ────────────────────────────────────────────────────────────

function DayCard({ day, isLast }: { day: ParsedItinerary['days'][number]; isLast: boolean }) {
  const palette = cityPalette(day.city)

  return (
    <div className={cn('rounded-xl border border-border/50 overflow-hidden', !isLast && 'mb-3')}>
      {/* Day header */}
      <div className={cn('bg-linear-to-r px-4 py-3', palette.from, palette.to)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">
              Day {day.day}
            </span>
            {day.city && (
              <span className={cn('flex items-center gap-1 text-[11px] font-semibold', palette.text)}>
                <MapPin className="h-3 w-3" />
                {day.city}
              </span>
            )}
          </div>
          {day.estimatedCost && (
            <span className="flex items-center gap-0.5 text-[10px] text-white/50">
              <DollarSign className="h-3 w-3" />
              {day.estimatedCost.replace(/Estimated Cost:?\s*/i, '')}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm font-medium text-white/90 leading-snug">
          {day.title.replace(/^Day\s*\d+[\s*:—–-]*/i, '').replace(new RegExp(`^${day.city}\\s*[—–-]\\s*`, 'i'), '')}
        </p>
      </div>

      {/* Activities */}
      {day.activities.length > 0 && (
        <div className="bg-card/60 divide-y divide-border/30">
          {day.activities.map((act, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5">
              <ActivityIcon type={act.type} />
              <div className="min-w-0">
                {act.time && (
                  <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground block mb-0.5">
                    {act.time}
                  </span>
                )}
                <p className="text-[13px] text-foreground/80 leading-snug line-clamp-3">
                  {act.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Trip header banner ─────────────────────────────────────────────────────────

interface TripBannerProps {
  itinerary: ParsedItinerary
  travelers?: number
  startDate?: string
}

function TripBanner({ itinerary, travelers, startDate }: TripBannerProps) {
  return (
    <div className="mb-4 rounded-xl bg-linear-to-br from-primary/15 to-primary/5 border border-primary/20 p-4">
      <h2 className="text-sm font-semibold text-foreground leading-snug mb-2 line-clamp-2">
        {itinerary.title}
      </h2>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <Chip icon={<Calendar className="h-3 w-3" />} label={`${itinerary.totalDays} days`} />
        {travelers && <Chip icon={<Users className="h-3 w-3" />} label={`${travelers} traveller${travelers !== 1 ? 's' : ''}`} />}
        {startDate && <Chip icon={<MapPin className="h-3 w-3" />} label={startDate} />}
        {itinerary.totalBudget && (
          <Chip icon={<DollarSign className="h-3 w-3" />} label={itinerary.totalBudget} />
        )}
      </div>
    </div>
  )
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      {icon}
      {label}
    </span>
  )
}

// ── Main ItineraryCanvas ───────────────────────────────────────────────────────

interface ItineraryCanvasProps {
  itinerary: ParsedItinerary
  travelers?: number
  startDate?: string
}

export function ItineraryCanvas({ itinerary, travelers, startDate }: ItineraryCanvasProps) {
  return (
    <div className="flex flex-col">
      <TripBanner itinerary={itinerary} travelers={travelers} startDate={startDate} />
      {itinerary.days.map((day, i) => (
        <DayCard key={day.day} day={day} isLast={i === itinerary.days.length - 1} />
      ))}
    </div>
  )
}
