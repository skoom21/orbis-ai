import React from 'react'
import { Plane, Hotel as HotelIcon, Calendar, MapPin, Star, BadgeCheck, ReceiptText, Copy } from 'lucide-react'
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

function formatPrice(price?: number, currency: string = 'USD'): string {
  if (typeof price !== 'number' || Number.isNaN(price)) return 'Price unavailable'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price)
  } catch {
    return `${currency} ${price.toFixed(0)}`
  }
}

function scoreToFive(rating?: number): number | undefined {
  if (typeof rating !== 'number' || Number.isNaN(rating)) return undefined
  return rating <= 5 ? rating : rating / 2
}

export function FlightCard({ data }: { data: string }) {
  // Scaffold implementation
  let parsed: any = {};
  try { parsed = JSON.parse(data) } catch (e) { parsed = { error: "Invalid flight data", raw: data } }
  
  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-surface-1 shadow-sm p-4 mb-4 hover:border-primary/40 transition-all">
      <div className="flex items-center justify-between mb-3 text-primary">
         <div className="flex items-center gap-2 font-medium">
             <Plane className="h-4 w-4" />
             <span>Flight Option</span>
         </div>
         <span className="text-xs font-semibold bg-primary/10 px-2 py-1 rounded-full">Recommended</span>
      </div>
      {parsed.error ? <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{parsed.raw}</pre> : (
         <div className="space-y-3">
             <div className="flex justify-between items-center text-sm">
                 <div className="font-semibold text-lg">{parsed.airline || "Airline"}</div>
                 <div className="font-bold text-lg text-foreground">{parsed.price || "$0.00"}</div>
             </div>
             <div className="flex items-center justify-between text-xs text-muted-foreground">
                 <div>
                     <div className="font-medium text-foreground">{parsed.departureTime || "08:00 AM"}</div>
                     <div>{parsed.origin || "Origin"}</div>
                 </div>
                 <div className="flex-1 px-4 flex flex-col items-center">
                     <span className="text-[10px]">{parsed.duration || "2h 30m"}</span>
                     <div className="w-full h-px bg-border my-1 relative">
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-1 px-1 text-[8px] border border-border rounded-full">{parsed.stops || "Direct"}</div>
                     </div>
                 </div>
                 <div className="text-right">
                     <div className="font-medium text-foreground">{parsed.arrivalTime || "10:30 AM"}</div>
                     <div>{parsed.destination || "Dest"}</div>
                 </div>
             </div>
         </div>
      )}
    </div>
  )
}

export function HotelCard({ data }: { data: string }) {
  let parsed: HotelResultItem | null = null
  try {
    const raw = JSON.parse(data)
    if (typeof raw === 'object' && raw) {
      parsed = raw as HotelResultItem
    }
  } catch {
    parsed = null
  }

  if (!parsed) {
    return null
  }

  const displayRating = scoreToFive(parsed.rating)

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-background shadow-sm overflow-hidden mb-4 hover:border-primary/35 transition-all">
      <div className="h-28 bg-muted/50 flex items-center justify-center relative overflow-hidden">
        {parsed.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={parsed.photo} alt={parsed.name} className="h-full w-full object-cover" />
        ) : (
          <HotelIcon className="h-8 w-8 text-muted-foreground/30" />
        )}
        {displayRating && (
          <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm text-[10px] font-semibold px-2 py-1 rounded-full border border-border">
            {displayRating.toFixed(1)} <Star className="ml-1 inline-block h-3 w-3 fill-current" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-foreground mb-1 line-clamp-1">{parsed.name}</h4>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3 line-clamp-1">
          <MapPin className="h-3 w-3" />
          <span>{parsed.address || parsed.city || 'Location unavailable'}</span>
        </div>
        <div className="flex justify-between items-end">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{formatPrice(parsed.price, parsed.currency)}</span> / stay
          </div>
          <Badge variant="secondary" className="text-[11px]">{parsed.stars ? `${parsed.stars} star` : 'Hotel'}</Badge>
        </div>
      </div>
    </div>
  )
}

export function ItineraryCard({ data }: { data: string }) {
  let parsed: any = {};
  try { parsed = JSON.parse(data) } catch (e) { parsed = { raw: data } }
  return (
    <div className="w-full rounded-xl border border-border bg-surface-1 shadow-sm p-4 mb-4 hover:border-primary/40 transition-all relative overflow-hidden">
      <div className="absolute left-6 top-10 bottom-4 w-px bg-border/50" />
      <div className="flex items-center gap-2 mb-4 text-primary font-medium border-b border-border/50 pb-2">
          <Calendar className="h-4 w-4" />
          <span>{parsed.day || "Day 1"} - {parsed.title || "Exploring the city"}</span>
      </div>
      <div className="space-y-4 relative z-10">
          {(parsed.activities || [{time: "09:00 AM", desc: "Start the day"}, {time: "12:00 PM", desc: "Lunch break"}]).map((act: any, i: number) => (
             <div key={i} className="flex gap-3">
                 <div className="w-2 h-2 rounded-full bg-primary ring-4 ring-surface-1 mt-1.5 shrink-0" />
                 <div>
                     <div className="text-xs font-semibold text-foreground">{act.time}</div>
                     <div className="text-[13px] text-muted-foreground mt-0.5">{act.desc}</div>
                 </div>
             </div>
          ))}
      </div>
    </div>
  )
}

interface HotelResultsCarouselProps {
  items: HotelResultItem[]
  title?: string
  subtitle?: string
}

export function HotelResultsCarousel({ items, title, subtitle }: HotelResultsCarouselProps) {
  if (items.length === 0) return null

  return (
    <section className="space-y-3 rounded-2xl border border-border/80 bg-linear-to-b from-background to-muted/20 p-3 sm:p-4">
      <div className="px-1">
        <div className="text-sm font-semibold text-foreground">{title || 'Available stays'}</div>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory">
        {items.map((hotel) => (
          <Dialog key={hotel.id}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="group snap-start min-w-[255px] max-w-[255px] rounded-2xl border border-border bg-background text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="relative h-36 overflow-hidden rounded-t-2xl bg-muted/40">
                  {hotel.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hotel.photo}
                      alt={hotel.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <HotelIcon className="h-9 w-9 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[11px] font-semibold shadow-sm">
                    {typeof hotel.rating === 'number' ? `${scoreToFive(hotel.rating)?.toFixed(1) || '-'} / 5` : 'No rating'}
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  <h4 className="line-clamp-1 text-sm font-semibold text-foreground">{hotel.name}</h4>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{hotel.address || hotel.city || 'Location unavailable'}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {hotel.description || 'Tap to view room, price, and full hotel details.'}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-sm font-semibold text-foreground">{formatPrice(hotel.price, hotel.currency)}</div>
                    {hotel.offerId ? <Badge className="text-[10px]">Bookable</Badge> : <Badge variant="secondary" className="text-[10px]">Info</Badge>}
                  </div>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0 overflow-hidden">
              <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
                <div className="h-56 md:h-full bg-muted/40">
                  {hotel.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hotel.photo} alt={hotel.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <HotelIcon className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <DialogHeader className="text-left">
                    <DialogTitle className="text-xl">{hotel.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 text-xs">
                      <MapPin className="h-3.5 w-3.5" />
                      {hotel.address || hotel.city || 'Address unavailable'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {typeof hotel.rating === 'number' ? (
                      <Badge variant="secondary">
                        <Star className="mr-1 h-3 w-3" /> {scoreToFive(hotel.rating)?.toFixed(1)} / 5
                      </Badge>
                    ) : null}
                    {hotel.stars ? <Badge variant="secondary">{hotel.stars} star</Badge> : null}
                    {hotel.roomType ? <Badge variant="secondary">{hotel.roomType}</Badge> : null}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {hotel.description || 'Detailed description is not available for this listing.'}
                  </p>
                  <div className="mt-6 rounded-xl border border-border bg-muted/25 p-3">
                    <div className="text-xs text-muted-foreground">Estimated total</div>
                    <div className="text-xl font-semibold text-foreground mt-1">{formatPrice(hotel.price, hotel.currency)}</div>
                    {hotel.offerId ? <p className="mt-1 text-[11px] text-muted-foreground">Offer ID: {hotel.offerId}</p> : null}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </section>
  )
}

interface BookingStatusCardsProps {
  title?: string
  items: BookingSummaryItem[]
}

export function BookingStatusCards({ title, items }: BookingStatusCardsProps) {
  if (items.length === 0) return null

  return (
    <section className="space-y-2 rounded-2xl border border-border/80 bg-background p-3 sm:p-4">
      <div className="text-sm font-semibold text-foreground">{title || 'Booking update'}</div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.bookingId} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                {item.hotelName || 'Hotel Booking'}
              </div>
              <Badge className="uppercase tracking-wide text-[10px]">{item.status || 'confirmed'}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><ReceiptText className="h-3.5 w-3.5" /> {item.bookingId}</span>
              {typeof item.totalPrice === 'number' ? <span>{formatPrice(item.totalPrice, item.currency)}</span> : null}
            </div>
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 text-xs"
                onClick={() => navigator.clipboard.writeText(item.bookingId)}
              >
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy Booking ID
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
