import React, { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link2, Wrench, FileText, CalendarDays, PanelRight } from 'lucide-react'
import type {
  MessageContentPart,
  MessageSourceItem,
  MessageAttachmentItem,
  HotelResultItem,
  BookingSummaryItem,
} from '../types'
import { FlightCard, HotelCard, ItineraryCard, HotelResultsCarousel, BookingStatusCards } from './travel-cards'
import { DynamicTravelForm } from './dynamic-form'
import type { DynamicFormSchema } from './dynamic-form'
import { cn } from '@/lib/utils'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseSources(value: unknown): MessageSourceItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRecord)
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title : 'Untitled source',
      url: typeof item.url === 'string' ? item.url : undefined,
      snippet: typeof item.snippet === 'string' ? item.snippet : undefined,
    }))
}

function parseAttachments(value: unknown): MessageAttachmentItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRecord)
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name : 'Attachment',
      url: typeof item.url === 'string' ? item.url : undefined,
      mimeType: typeof item.mimeType === 'string' ? item.mimeType : undefined,
    }))
}

function parsePart(value: unknown): MessageContentPart | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null

  switch (value.type) {
    case 'text':
      return {
        type: 'text',
        text: typeof value.text === 'string' ? value.text : '',
      }
    case 'markdown':
      return {
        type: 'markdown',
        markdown: typeof value.markdown === 'string' ? value.markdown : '',
      }
    case 'tool-call':
      return {
        type: 'tool-call',
        name: typeof value.name === 'string' ? value.name : 'tool',
        input: value.input,
        output: value.output,
      }
    case 'sources':
      return {
        type: 'sources',
        items: parseSources(value.items),
      }
    case 'search-results':
      return {
        type: 'search-results',
        items: parseSources(value.items),
      }
    case 'attachments':
      return {
        type: 'attachments',
        items: parseAttachments(value.items),
      }
    case 'artifact':
      return {
        type: 'artifact',
        label: typeof value.label === 'string' ? value.label : 'Artifact',
        data: value.data,
      }
    case 'hotel-results':
      return {
        type: 'hotel-results',
        title: typeof value.title === 'string' ? value.title : undefined,
        subtitle: typeof value.subtitle === 'string' ? value.subtitle : undefined,
        items: parseHotelItems(value.items),
      }
    case 'booking-update':
      return {
        type: 'booking-update',
        title: typeof value.title === 'string' ? value.title : undefined,
        items: parseBookingItems(value.items),
      }
    default:
      return null
  }
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function parseHotelItem(value: unknown): HotelResultItem | null {
  if (!isRecord(value)) return null

  const id = typeof value.id === 'string' ? value.id : typeof value.hotelId === 'string' ? value.hotelId : undefined
  const name = typeof value.name === 'string' ? value.name : typeof value.hotel_name === 'string' ? value.hotel_name : undefined
  if (!id || !name) return null

  const price =
    toNumber(value.total_price_usd) ??
    toNumber(value.price) ??
    toNumber(value.totalPrice) ??
    (isRecord(value.lowest_price) ? toNumber(value.lowest_price.total_price) : undefined) ??
    (isRecord(value.lowest_price) ? toNumber(value.lowest_price.amount) : undefined) ??
    toNumber((value as Record<string, unknown>).price_per_night)

  const currency =
    typeof value.currency === 'string'
      ? value.currency
      : isRecord(value.lowest_price) && typeof value.lowest_price.currency === 'string'
        ? value.lowest_price.currency
        : 'USD'

  return {
    id,
    name,
    city: typeof value.city === 'string' ? value.city : undefined,
    address: typeof value.address === 'string' ? value.address : undefined,
    description: typeof value.description === 'string' ? value.description : undefined,
    rating: toNumber(value.rating),
    stars: toNumber(value.stars),
    photo:
      typeof value.photo === 'string'
        ? value.photo
        : typeof value.main_photo === 'string'
          ? value.main_photo
          : undefined,
    price,
    currency,
    roomType:
      typeof value.room_type === 'string'
        ? value.room_type
        : typeof value.roomType === 'string'
          ? value.roomType
          : typeof value.best_room_type === 'string'
            ? value.best_room_type
            : undefined,
    offerId:
      typeof value.offer_id === 'string'
        ? value.offer_id
        : typeof value.offerId === 'string'
          ? value.offerId
          : typeof value.best_offer_id === 'string'
            ? value.best_offer_id
            : undefined,
    source: value,
  }
}

function parseHotelItems(value: unknown): HotelResultItem[] {
  if (!Array.isArray(value)) return []
  return value.map(parseHotelItem).filter((item): item is HotelResultItem => Boolean(item))
}

function parseBookingItem(value: unknown): BookingSummaryItem | null {
  if (!isRecord(value)) return null

  const bookingId =
    typeof value.booking_id === 'string'
      ? value.booking_id
      : typeof value.bookingId === 'string'
        ? value.bookingId
        : typeof value.id === 'string'
          ? value.id
          : undefined

  if (!bookingId) return null

  return {
    bookingId,
    status: typeof value.status === 'string' ? value.status : undefined,
    hotelName:
      typeof value.hotel === 'string'
        ? value.hotel
        : typeof value.hotel_name === 'string'
          ? value.hotel_name
          : undefined,
    totalPrice: toNumber(value.total_price) ?? toNumber(value.totalPrice) ?? toNumber(value.price),
    currency: typeof value.currency === 'string' ? value.currency : 'USD',
    source: value,
  }
}

function parseBookingItems(value: unknown): BookingSummaryItem[] {
  if (!Array.isArray(value)) return []
  return value.map(parseBookingItem).filter((item): item is BookingSummaryItem => Boolean(item))
}

function parseStructuredPayload(value: unknown): MessageContentPart[] {
  if (!isRecord(value)) return []

  let payload = value;
  // Deep flatten if the AI wraps the response in a single key object e.g. {"hotel_response": {"hotels": [...]}}
  if (Object.keys(payload).length === 1) {
    const inner = Object.values(payload)[0];
    if (isRecord(inner) && (Array.isArray(inner.hotels) || Array.isArray(inner.bookings) || Array.isArray(inner.flights))) {
      payload = inner;
    }
  }

  if (Array.isArray(payload.hotels)) {
    const items = parseHotelItems(payload.hotels)
    if (items.length > 0) {
      return [
        {
          type: 'hotel-results',
          title: typeof payload.title === 'string' ? payload.title : 'Available Hotels',
          subtitle: typeof payload.note === 'string' ? payload.note : undefined,
          items,
        },
      ]
    }
  }

  if (Array.isArray(payload.flights) && payload.flights.length > 0) {
    return [
      {
        type: 'flight-results',
        data: payload.flights,
      },
    ]
  }

  if (typeof payload.status === 'string' && (typeof payload.booking_id === 'string' || typeof payload.bookingId === 'string')) {
    const parsedBooking = parseBookingItem(payload)
    if (parsedBooking) {
      return [
        {
          type: 'booking-update',
          title: 'Booking Update',
          items: [parsedBooking],
        },
      ]
    }
  }

  if (Array.isArray(payload.bookings)) {
    const bookings = parseBookingItems(payload.bookings)
    if (bookings.length > 0) {
      return [
        {
          type: 'booking-update',
          title: typeof payload.title === 'string' ? payload.title : 'Booking Updates',
          items: bookings,
        },
      ]
    }
  }

  return []
}

export function parseMessageParts(content: string): MessageContentPart[] {
  let trimmed = content.trim()
  
  // if wrapped in markdown formatting, unwrap it
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim()
  }

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return [{ type: 'markdown', markdown: content }]
  }

  // Attempt to fix common Python-to-JSON formatting errors from the LLM
  trimmed = trimmed
    .replace(/:\s*None/g, ': null')
    .replace(/:\s*True/g, ': true')
    .replace(/:\s*False/g, ': false')

  try {
    const parsed = JSON.parse(trimmed)

    if (Array.isArray(parsed)) {
      const parts = parsed.map(parsePart).filter((part): part is MessageContentPart => Boolean(part))
      return parts.length > 0 ? parts : [{ type: 'markdown', markdown: content }]
    }

    if (isRecord(parsed) && Array.isArray(parsed.parts)) {
      const parts = parsed.parts.map(parsePart).filter((part): part is MessageContentPart => Boolean(part))
      return parts.length > 0 ? parts : [{ type: 'markdown', markdown: content }]
    }

    const structured = parseStructuredPayload(parsed)
    if (structured.length > 0) {
      return structured
    }
  } catch {
    return [{ type: 'markdown', markdown: content }]
  }

  return [{ type: 'markdown', markdown: content }]
}

interface MessageContentPartsProps {
  content: string
}

export function MessageContentParts({ content }: MessageContentPartsProps) {
  const parts = useMemo(() => parseMessageParts(content), [content])

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <p key={`text-${index}`} className="whitespace-pre-wrap text-sm leading-relaxed">
              {part.text}
            </p>
          )
        }

        if (part.type === 'markdown') {
          return (
            <ReactMarkdown 
              key={`md-${index}`} 
              remarkPlugins={[remarkGfm]}
              components={{
                ul: ({node, ...props}) => { void node; return <ul className="pl-5 list-disc space-y-1 mb-4 text-[15px]" {...props} /> },
                ol: ({node, ...props}) => { void node; return <ol className="pl-5 list-decimal space-y-1 mb-4 text-[15px]" {...props} /> },
                li: ({node, ...props}) => { void node; return <li className="mb-1" {...props} /> },
                table: ({node, ...props}) => { void node; return <div className="overflow-x-auto mb-4 w-full rounded-lg border border-border/80"><table className="w-full text-left border-collapse text-[14px]" {...props} /></div> },
                th: ({node, ...props}) => { void node; return <th className="border-b border-border/80 p-3 font-semibold bg-muted/30 text-foreground" {...props} /> },
                td: ({node, ...props}) => { void node; return <td className="border-b border-border/40 p-3 align-top" {...props} /> },
                p: ({node, children, ...props}) => {
                  void node
                  const text = typeof children === 'string' ? children : Array.isArray(children) ? children.map(c => typeof c === 'string' ? c : '').join('') : ''
                  // Strip raw trip ID lines; show a workspace button instead
                  const isTripSaved = /trip id is|trip.*created.*system|I['']ve created your trip/i.test(text)
                  const hasTripId = /`[0-9a-f-]{36}`/.test(text)
                  if (isTripSaved || hasTripId) {
                    return (
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400 font-medium">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Trip saved to your workspace
                        </span>
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent('orbis:open-workspace'))}
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                        >
                          <PanelRight className="h-3 w-3" />
                          View in Workspace
                        </button>
                      </div>
                    )
                  }
                  return <p className="mb-4 text-[15px] leading-relaxed" {...props}>{children}</p>
                },
                 h1: ({node, ...props}) => { void node; return <h1 className="text-2xl font-bold mb-4 mt-6 text-foreground" {...props} /> },
                 h2: ({node, ...props}) => { void node; return <h2 className="text-xl font-bold mb-3 mt-5 text-foreground" {...props} /> },
                 h3: ({node, ...props}) => { void node; return <h3 className="text-lg font-semibold mb-3 mt-4 text-foreground" {...props} /> },
                 strong: ({node, ...props}) => { void node; return <strong className="font-semibold text-foreground" {...props} /> },
                 code: ({node, inline, className, children, ...props}) => {
                   void node
                   const match = /language-(\w+)/.exec(className || '')
                   const lang = match ? match[1] : ''
                   if (!inline && lang === 'flight') return <FlightCard data={String(children)} />
                   if (!inline && lang === 'hotel') return <HotelCard data={String(children)} />
                   if (!inline && lang === 'itinerary') return <ItineraryCard data={String(children)} />
                   if (!inline && lang === 'form') {
                     try {
                       const schema = JSON.parse(String(children).trim()) as DynamicFormSchema
                       if (schema && Array.isArray(schema.fields)) {
                         return <DynamicTravelForm schema={schema} className="my-3 max-w-sm" />
                       }
                     } catch {}
                   }
                   if (!inline && lang === 'json') {
                     try {
                       const cleanData = String(children)
                         .replace(/:\s*None/g, ': null')
                         .replace(/:\s*True/g, ': true')
                         .replace(/:\s*False/g, ': false');
                       const parsed = JSON.parse(cleanData);

                       // Itinerary data — consumed by the workspace panel, not rendered in chat
                       if (parsed && typeof parsed === 'object' && parsed.type === 'itinerary') {
                         return (
                           <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 rounded-full px-3 py-1 border border-border/40 my-1">
                             <CalendarDays className="h-3 w-3 text-primary/60" />
                             Itinerary saved — open Trip Workspace to view
                           </div>
                         )
                       }

                       // First check if it's an array of single items mapped to <HotelCard>
                       // If the AI accidentally returned [{...hotel...}] instead of {"hotels": []}
                       if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
                           return <div className="space-y-4">{parsed.map((p: unknown, i: number) => <HotelCard key={i} data={JSON.stringify(p)} />)}</div>
                       }
                       const structured = parseStructuredPayload(parsed);
                       if (structured.length > 0) {
                         const s = structured[0];
                         if (s.type === 'hotel-results') return <HotelResultsCarousel title={s.title} subtitle={s.subtitle} items={s.items} />
                         if (s.type === 'booking-update') return <BookingStatusCards title={s.title} items={s.items} />
                         if (s.type === 'flight-results') {
                           const rawFlights = Array.isArray((s as {data?: unknown}).data) ? (s as {data: unknown[]}).data : []
                           return <div className="my-4 space-y-4">{rawFlights.map((f, i) => <FlightCard key={i} data={JSON.stringify(f)} />)}</div>
                         }
                       }
                     } catch {}
                   }
                   return <code className={cn("bg-muted/50 px-1.5 py-0.5 rounded text-[13px] font-mono", !inline && "block p-4 overflow-x-auto mb-4 border border-border/50", className)} {...props}>{children}</code>
                }
              }}
            >
              {part.markdown}
            </ReactMarkdown>
          )
        }

        if (part.type === 'tool-call') {
          return (
            <div key={`tool-${index}`} className="rounded-lg border border-border bg-background/60 p-2 text-xs">
              <div className="mb-1 inline-flex items-center gap-1 font-medium text-foreground">
                <Wrench className="h-3.5 w-3.5" />
                Tool: {part.name}
              </div>
              {part.input !== undefined && (
                <pre className="mb-1 overflow-x-auto rounded bg-muted p-2 text-[11px]">
                  {JSON.stringify(part.input, null, 2)}
                </pre>
              )}
              {part.output !== undefined && (
                <pre className="overflow-x-auto rounded bg-muted p-2 text-[11px]">
                  {JSON.stringify(part.output, null, 2)}
                </pre>
              )}
            </div>
          )
        }

        if (part.type === 'sources' || part.type === 'search-results') {
          return (
            <div key={`sources-${index}`} className="rounded-lg border border-border bg-background/60 p-2">
              <div className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                <Link2 className="h-3.5 w-3.5" />
                {part.type === 'sources' ? 'Sources' : 'Search Results'}
              </div>
              <div className="space-y-2">
                {part.items.map((item, itemIndex) => (
                  <a
                    key={`${item.title}-${itemIndex}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border border-border/80 p-2 text-xs hover:bg-muted/40"
                  >
                    <div className="font-medium text-foreground">{item.title}</div>
                    {item.snippet && <div className="mt-1 text-muted-foreground">{item.snippet}</div>}
                  </a>
                ))}
              </div>
            </div>
          )
        }

        if (part.type === 'attachments') {
          return (
            <div key={`att-${index}`} className="rounded-lg border border-border bg-background/60 p-2">
              <div className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                <FileText className="h-3.5 w-3.5" />
                Attachments
              </div>
              <div className="space-y-1.5">
                {part.items.map((item, itemIndex) => (
                  <a
                    key={`${item.name}-${itemIndex}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border border-border/80 p-2 text-xs hover:bg-muted/40"
                  >
                    <div className="font-medium text-foreground">{item.name}</div>
                    {item.mimeType && <div className="text-muted-foreground">{item.mimeType}</div>}
                  </a>
                ))}
              </div>
            </div>
          )
        }

        if (part.type === 'hotel-results') {
          return (
            <HotelResultsCarousel
              key={`hotel-results-${index}`}
              title={part.title}
              subtitle={part.subtitle}
              items={part.items}
            />
          )
        }

        if (part.type === 'flight-results') {
          const rawFlights = Array.isArray(part.data) ? part.data : [];
          return (
            <div key={`flight-results-${index}`} className="my-4 space-y-4">
              {rawFlights.map((flight, fIdx) => (
                <FlightCard key={fIdx} data={JSON.stringify(flight)} />
              ))}
            </div>
          )
        }

        if (part.type === 'booking-update') {
          return <BookingStatusCards key={`booking-update-${index}`} title={part.title} items={part.items} />
        }

        return (
          <div key={`artifact-${index}`} className="rounded-lg border border-border bg-background/60 p-2 text-xs">
            <div className="mb-1 font-medium text-foreground">{part.label}</div>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-[11px]">
              {JSON.stringify(part.data ?? {}, null, 2)}
            </pre>
          </div>
        )
      })}
    </div>
  )
}

export const MemoizedMessageContentParts = memo(MessageContentParts)
