'use client'
import React, { useContext } from 'react'
import { Plane, Hotel as HotelIcon, Calendar, MapPin, Star, BadgeCheck, ReceiptText, Copy, ArrowRight, BedDouble, CalendarDays, Zap, ChevronRight } from 'lucide-react'
import type { BookingSummaryItem, HotelResultItem } from '../types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ChatContext } from '../providers'

// ── helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price?: number, currency: string = 'USD'): string {
  if (typeof price !== 'number' || Number.isNaN(price)) return 'Price unavailable'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price)
  } catch {
    return `${currency} ${price.toFixed(0)}`
  }
}

function scoreToFive(rating?: number): number | undefined {
  if (typeof rating !== 'number' || Number.isNaN(rating)) return undefined
  return rating <= 5 ? rating : rating / 2
}

/** Get sendMessage from ChatContext without throwing when used outside it */
function useOptionalSendMessage() {
  const ctx = useContext(ChatContext)
  return ctx?.sendMessage ?? null
}

// ── FlightCard ───────────────────────────────────────────────────────────────

export function FlightCard({ data }: { data: string }) {
  const sendMessage = useOptionalSendMessage()

  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(
      data.replace(/:\s*None/g, ': null').replace(/:\s*True/g, ': true').replace(/:\s*False/g, ': false')
    )
  } catch {
    parsed = { error: true, raw: data }
  }

  // Normalise field names — backend uses snake_case, legacy cards used camelCase
  const airline      = String(parsed.airline ?? 'Unknown Airline')
  const flightNumber = String(parsed.flight_number ?? parsed.flightNumber ?? '')
  const origin       = String(parsed.origin_airport ?? parsed.origin ?? '—')
  const destination  = String(parsed.destination_airport ?? parsed.destination ?? '—')
  const depTime      = String(parsed.departure_time ?? parsed.departureTime ?? '—')
  const arrTime      = String(parsed.arrival_time ?? parsed.arrivalTime ?? '—')
  const duration     = String(parsed.duration ?? '—')
  const stops        = Number(parsed.stops ?? 0)
  const stopsLabel   = stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`
  const priceUsd     = Number(parsed.price_usd ?? parsed.price ?? 0)
  const cabin        = String(parsed.cabin ?? 'Economy')

  const handleSelect = () => {
    if (!sendMessage) return
    sendMessage(
      `I'd like to book the ${airline} flight ${flightNumber} from ${origin} to ${destination}` +
      `${depTime !== '—' ? ` departing ${depTime}` : ''}, priced at ${formatPrice(priceUsd)} (${cabin}).`
    )
  }

  if (parsed.error) {
    return <pre className="p-4 text-xs text-muted-foreground whitespace-pre-wrap rounded-xl border border-border/50">{String(parsed.raw)}</pre>
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-border/60 bg-linear-to-b from-card to-card/50 shadow-xl overflow-hidden mb-4 group transition-all duration-500 hover:shadow-primary/10 hover:border-primary/20 relative">
      <div className="absolute inset-0 pointer-events-none" />

      {/* ── Carrier header ── */}
      <div className="flex items-center justify-between p-5 border-b border-dashed border-border/60 relative bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
            <Plane className="h-5 w-5 -rotate-45" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Carrier</div>
            <div className="font-semibold text-foreground tracking-tight">{airline}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Class</div>
          <div className="font-medium text-foreground tracking-tight capitalize">{cabin.toLowerCase()}</div>
        </div>
        <div className="absolute -left-3 -bottom-3 h-6 w-6 rounded-full bg-background border-t border-r border-border/60 rotate-45" />
        <div className="absolute -right-3 -bottom-3 h-6 w-6 rounded-full bg-background border-t border-l border-border/60 -rotate-45" />
      </div>

      {/* ── Route ── */}
      <div className="p-5 md:p-6 space-y-5 relative">
        <div className="flex items-center justify-between relative">
          <div className="w-1/3">
            <div className="text-3xl md:text-4xl font-light tracking-tighter text-foreground group-hover:text-primary transition-colors">{depTime.split(' ')[1] ?? depTime}</div>
            <div className="text-xs font-bold text-foreground/80 mt-0.5">{origin}</div>
          </div>
          <div className="flex-1 flex flex-col items-center px-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground bg-card z-10 px-2">{duration}</span>
            <div className="w-full h-px border-t border-dashed border-border/60 my-1 relative">
              <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 rotate-90" />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{stopsLabel}</span>
          </div>
          <div className="w-1/3 text-right">
            <div className="text-3xl md:text-4xl font-light tracking-tighter text-foreground group-hover:text-primary transition-colors">{arrTime.split(' ')[1] ?? arrTime}</div>
            <div className="text-xs font-bold text-foreground/80 mt-0.5 ml-auto">{destination}</div>
          </div>
        </div>

        {/* ── Price + CTA ── */}
        <div className="flex items-end justify-between bg-muted/30 p-4 rounded-2xl border border-border/40">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Total Price</div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{formatPrice(priceUsd)}</div>
          </div>
          <Button
            className="rounded-full shadow-lg h-9 px-6 font-medium tracking-wide gap-1.5"
            onClick={handleSelect}
            disabled={!sendMessage}
          >
            <Zap className="h-3.5 w-3.5" />
            Select Flight
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── HotelCard ────────────────────────────────────────────────────────────────

export function HotelCard({ data }: { data: string }) {
  const sendMessage = useOptionalSendMessage()

  let parsed: HotelResultItem | null = null
  try {
    const raw = JSON.parse(
      data.replace(/:\s*None/g, ': null').replace(/:\s*True/g, ': true').replace(/:\s*False/g, ': false')
    )
    if (typeof raw === 'object' && raw) parsed = raw as HotelResultItem
  } catch {
    parsed = null
  }

  if (!parsed) return null

  const displayRating = scoreToFive(parsed.rating)
  const offerId = parsed.offerId ?? (parsed as unknown as Record<string, unknown>).best_offer_id as string | undefined

  const handleSelect = () => {
    if (!sendMessage) return
    sendMessage(
      `I'd like to book ${parsed!.name}${parsed!.city ? ` in ${parsed!.city}` : ''}` +
      `${offerId ? `. The offer ID is ${offerId}.` : '.'}`
    )
  }

  return (
    <div className="w-full max-w-sm rounded-4xl border border-border/40 bg-card shadow-2xl shadow-black/5 overflow-hidden mb-6 group relative transition-transform duration-500 hover:-translate-y-1">
      <div className="h-48 bg-muted relative overflow-hidden rounded-t-4xl">
        {parsed.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={parsed.photo} alt={parsed.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted-foreground/5">
            <HotelIcon className="h-10 w-10 text-muted-foreground/20" strokeWidth={1} />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60" />
        {displayRating && (
          <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-md text-[11px] font-bold tracking-wide px-3 py-1.5 rounded-full shadow-sm text-foreground flex items-center gap-1.5">
            {displayRating.toFixed(1)} <Star className="h-3 w-3 fill-primary text-primary" />
          </div>
        )}
      </div>

      <div className="p-6 relative -mt-4 bg-card rounded-t-3xl border-t border-border/10">
        <div className="flex justify-between items-start mb-2 gap-4">
          <h4 className="font-semibold text-lg text-foreground line-clamp-1 flex-1 tracking-tight">{parsed.name}</h4>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="line-clamp-1">{parsed.address || parsed.city || 'Location unavailable'}</span>
        </div>
        <div className="h-px w-full bg-border/40 my-4" />
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-0.5">Per Night</div>
            <div className="text-xl font-semibold tracking-tight text-foreground">{formatPrice(parsed.price, parsed.currency)}</div>
          </div>
          <Button
            className="rounded-full h-10 px-5 gap-1.5"
            onClick={handleSelect}
            disabled={!sendMessage}
          >
            <Zap className="h-3.5 w-3.5" />
            Book
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── ItineraryCard ────────────────────────────────────────────────────────────

export function ItineraryCard({ data }: { data: string }) {
  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(
      data.replace(/:\s*None/g, ': null').replace(/:\s*True/g, ': true').replace(/:\s*False/g, ': false')
    )
  } catch {
    parsed = { raw: data }
  }

  return (
    <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-lg p-6 mb-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
      <div className="flex items-end justify-between mb-8 border-b border-border/50 pb-4 relative">
        <div>
          <div className="text-xs font-bold tracking-widest uppercase text-primary mb-1">{String(parsed.day ?? 'Day 1')}</div>
          <h3 className="text-xl font-medium tracking-tight text-foreground">{String(parsed.title ?? 'Exploring the city')}</h3>
        </div>
        <CalendarDays className="h-8 w-8 text-muted-foreground/30 stroke-1" />
      </div>
      <div className="space-y-6 relative ml-2">
        <div className="absolute top-2 bottom-2 left-1.5 w-px bg-linear-to-b from-primary/40 via-border to-transparent" />
        {(Array.isArray(parsed.activities) ? parsed.activities : [{ time: '09:00 AM', desc: 'Start the day' }, { time: '12:00 PM', desc: 'Lunch break' }]).map((act: unknown, i: number) => {
          const a = act as Record<string, string>
          return (
            <div key={i} className="relative pl-8 group/item">
              <div className="absolute left-[3px] top-1.5 w-1.5 h-1.5 rounded-full bg-background border-2 border-primary ring-4 ring-card transition-transform group-hover/item:scale-150" />
              <div>
                <div className="inline-flex items-center rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{a.time}</div>
                <div className="text-sm font-medium leading-relaxed text-foreground/90">{a.desc}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── HotelResultsCarousel ─────────────────────────────────────────────────────

interface HotelResultsCarouselProps {
  items: HotelResultItem[]
  title?: string
  subtitle?: string
}

export function HotelResultsCarousel({ items, title, subtitle }: HotelResultsCarouselProps) {
  const sendMessage = useOptionalSendMessage()

  if (items.length === 0) return null

  return (
    <section className="mb-8 overflow-hidden pt-4 pb-2">
      <div className="px-1 mb-5 flex items-end justify-between">
        <div>
          <div className="text-2xl font-light tracking-tight text-foreground">{title ?? 'Curated Stays'}</div>
          {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground max-w-lg">{subtitle}</p> : null}
        </div>
      </div>

      <div
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-6 pt-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((hotel) => {
          const offerId = hotel.offerId ?? (hotel as unknown as Record<string, unknown>).best_offer_id as string | undefined

          const handleDialogBook = () => {
            if (!sendMessage) return
            sendMessage(
              `I'd like to book ${hotel.name}${hotel.city ? ` in ${hotel.city}` : ''}` +
              `${offerId ? `. Offer ID: ${offerId}.` : '.'}`
            )
          }

          return (
            <Dialog key={hotel.id}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="group snap-start min-w-[280px] max-w-[280px] rounded-4xl border border-border/50 bg-card text-left shadow-lg shadow-black/3 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/5 focus:outline-none"
                >
                  <div className="relative h-44 overflow-hidden rounded-t-4xl bg-muted/40">
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent z-10 opacity-80 transition-opacity group-hover:opacity-60" />
                    {hotel.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={hotel.photo}
                        alt={hotel.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <HotelIcon className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 z-20 rounded-full bg-background/95 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase text-foreground shadow-sm flex items-center gap-1.5 border border-border/50">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      {typeof hotel.rating === 'number' ? scoreToFive(hotel.rating)?.toFixed(1) : 'NEW'}
                    </div>
                    <div className="absolute bottom-4 left-4 z-20">
                      <div className="text-[10px] font-bold tracking-widest uppercase text-white/80 drop-shadow-md">Starting at</div>
                      <div className="text-xl font-medium text-white drop-shadow-lg">{formatPrice(hotel.price, hotel.currency)}</div>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-2">
                    <h4 className="line-clamp-1 text-base font-semibold tracking-tight text-foreground">{hotel.name}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="line-clamp-1">{hotel.address || hotel.city || 'Location unavailable'}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {offerId ? (
                        <Badge variant="default" className="text-[9px] uppercase tracking-wider font-bold h-5 px-2">Bookable</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] uppercase tracking-wider font-bold h-5 px-2 rounded-full">Details</Badge>
                      )}
                      {hotel.stars ? <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold h-5 px-2 rounded-full">{hotel.stars} Star</Badge> : null}
                    </div>
                  </div>
                </button>
              </DialogTrigger>

              <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-4xl border-border/50 shadow-2xl bg-card">
                <div className="grid md:grid-cols-[1fr_1fr] h-[80vh] md:h-auto md:max-h-[85vh]">
                  <div className="relative h-64 md:h-full bg-muted/20">
                    {hotel.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={hotel.photo} alt={hotel.name} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BedDouble className="h-16 w-16 text-muted-foreground/20" strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t md:bg-linear-to-r from-black/80 via-transparent to-transparent opacity-60 md:opacity-40" />
                    <div className="absolute bottom-6 left-6 md:hidden">
                      <h2 className="text-2xl font-semibold text-white drop-shadow-md">{hotel.name}</h2>
                    </div>
                  </div>

                  <div className="flex flex-col h-full overflow-y-auto px-6 py-8 md:px-8">
                    <DialogHeader className="text-left hidden md:block mb-6">
                      <DialogTitle className="text-3xl font-light tracking-tight">{hotel.name}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 text-sm mt-3 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {hotel.address || hotel.city || 'Address unavailable'}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-wrap gap-2 mb-8">
                      {typeof hotel.rating === 'number' ? (
                        <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                          <Star className="h-3.5 w-3.5 fill-current" /> {scoreToFive(hotel.rating)?.toFixed(1)} Rating
                        </div>
                      ) : null}
                      {hotel.stars ? (
                        <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {hotel.stars} Star Property
                        </div>
                      ) : null}
                      {hotel.roomType ? (
                        <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                          <BedDouble className="h-3.5 w-3.5" /> {hotel.roomType}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex-1">
                      <h4 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">About this stay</h4>
                      <p className="text-sm leading-relaxed text-foreground/80 md:text-base">
                        {hotel.description ?? 'Exclusive details are currently unavailable for this listing, but it matches your search parameters perfectly.'}
                      </p>
                    </div>

                    <div className="mt-8 pt-8 border-t border-border/40">
                      <div className="flex items-end justify-between mb-6">
                        <div>
                          <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Estimated Total</div>
                          <div className="text-3xl font-medium tracking-tight text-foreground">{formatPrice(hotel.price, hotel.currency)}</div>
                        </div>
                        {offerId && (
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Offer ID</div>
                            <div className="font-mono text-xs text-foreground bg-muted tracking-widest px-2 py-1 rounded mt-1">{offerId}</div>
                          </div>
                        )}
                      </div>

                      <Button
                        className="w-full rounded-2xl h-14 text-base font-semibold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform gap-2"
                        onClick={handleDialogBook}
                        disabled={!sendMessage}
                      >
                        <Zap className="h-4 w-4" />
                        {offerId ? 'Book this Hotel' : 'Check Availability'}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )
        })}
      </div>
    </section>
  )
}

// ── BookingStatusCards ───────────────────────────────────────────────────────

interface BookingStatusCardsProps {
  title?: string
  items: BookingSummaryItem[]
}

export function BookingStatusCards({ title, items }: BookingStatusCardsProps) {
  if (items.length === 0) return null

  return (
    <section className="space-y-4 mb-6">
      <div className="text-sm font-bold tracking-widest uppercase text-muted-foreground/70 px-1">{title ?? 'Itinerary Updates'}</div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.bookingId} className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-card to-muted/10 p-5 shadow-sm group">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <BadgeCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-0.5">Reservation</div>
                    <div className="font-semibold tracking-tight text-foreground text-base line-clamp-1">{item.hotelName ?? 'Pending Assignment'}</div>
                  </div>
                </div>
                <Badge variant="outline" className="uppercase tracking-wider text-[9px] font-bold h-6 px-3 bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400">
                  {item.status ?? 'Confirmed'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1 flex items-center gap-1.5">
                    <ReceiptText className="h-3 w-3" /> Booking Reference
                  </div>
                  <div className="font-mono text-xs font-medium tracking-widest bg-muted/50 px-2 py-1 rounded inline-block">{item.bookingId}</div>
                </div>
                {typeof item.totalPrice === 'number' && (
                  <div className="text-right">
                    <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Amount</div>
                    <div className="font-semibold text-lg tracking-tight">{formatPrice(item.totalPrice, item.currency)}</div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl h-10 text-xs font-semibold hover:bg-muted/50 border-border/60"
                  onClick={() => navigator.clipboard.writeText(item.bookingId)}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copy ID
                </Button>
                <Button variant="default" className="flex-1 rounded-xl h-10 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90">
                  View Details
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
