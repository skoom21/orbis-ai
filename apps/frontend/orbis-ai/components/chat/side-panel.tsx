'use client'

import React, { useMemo, useState } from 'react'
import { X, CalendarDays, Plane, Hotel, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ItineraryCanvas } from './workspace/itinerary-canvas'
import { parseItineraryFromMarkdown } from './workspace/parse-itinerary'
import type { ChatMessage } from './types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChatSidePanelProps {
  isOpen: boolean
  onToggle: () => void
  messages: ChatMessage[]
  isStreaming?: boolean
  streamingMessage?: string
  currentAgent?: string | null
}

type PanelTab = 'plan' | 'flights' | 'hotels'

// ── Data extraction from messages ─────────────────────────────────────────────

function useWorkspaceData(messages: ChatMessage[], streamingMessage?: string, currentAgent?: string | null) {
  return useMemo(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant').reverse()

    // --- Itinerary: scan most recent assistant messages for day-by-day plans ---
    let itinerary = null
    for (const msg of assistantMessages) {
      itinerary = parseItineraryFromMarkdown(msg.content)
      if (itinerary) break
    }

    // Also try the streaming message if planner is active
    let streamingItinerary = null
    if (currentAgent === 'planner' && streamingMessage) {
      streamingItinerary = parseItineraryFromMarkdown(streamingMessage)
    }

    // --- Flights: scan for ```json blocks containing flights array ---
    const flights: unknown[] = []
    for (const msg of assistantMessages) {
      const jsonBlocks = [...msg.content.matchAll(/```json\s*([\s\S]*?)```/gi)]
      for (const [, raw] of jsonBlocks) {
        try {
          const parsed = JSON.parse(raw.replace(/:\s*None/g, ':null').replace(/:\s*True/g, ':true').replace(/:\s*False/g, ':false'))
          if (Array.isArray(parsed?.flights)) {
            flights.push(...parsed.flights)
          }
        } catch { /* ignore */ }
      }
      if (flights.length > 0) break
    }

    // --- Hotels: scan for ```json blocks containing hotels array ---
    const hotels: unknown[] = []
    for (const msg of assistantMessages) {
      const jsonBlocks = [...msg.content.matchAll(/```json\s*([\s\S]*?)```/gi)]
      for (const [, raw] of jsonBlocks) {
        try {
          const parsed = JSON.parse(raw.replace(/:\s*None/g, ':null').replace(/:\s*True/g, ':true').replace(/:\s*False/g, ':false'))
          if (Array.isArray(parsed?.hotels)) {
            hotels.push(...parsed.hotels)
          }
        } catch { /* ignore */ }
      }
      if (hotels.length > 0) break
    }

    return {
      itinerary: streamingItinerary ?? itinerary,
      isStreamingItinerary: !!streamingItinerary,
      flights,
      hotels,
    }
  }, [messages, streamingMessage, currentAgent])
}

// ── Tab bar ────────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, hasPlan, hasFlights, hasHotels }: {
  active: PanelTab
  onChange: (t: PanelTab) => void
  hasPlan: boolean
  hasFlights: boolean
  hasHotels: boolean
}) {
  const tabs: { id: PanelTab; label: string; icon: React.ReactNode; has: boolean }[] = [
    { id: 'plan',    label: 'Plan',    icon: <CalendarDays className="h-3.5 w-3.5" />, has: hasPlan    },
    { id: 'flights', label: 'Flights', icon: <Plane        className="h-3.5 w-3.5" />, has: hasFlights },
    { id: 'hotels',  label: 'Hotels',  icon: <Hotel        className="h-3.5 w-3.5" />, has: hasHotels  },
  ]

  return (
    <div className="flex border-b border-border shrink-0">
      {tabs.map(({ id, label, icon, has }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-[12px] font-medium transition-colors relative',
            active === id
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {icon}
          {label}
          {has && <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-primary" />}
          {active === id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      ))}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ tab, isStreaming, currentAgent }: { tab: PanelTab; isStreaming?: boolean; currentAgent?: string | null }) {
  const isWorking = isStreaming && (
    (tab === 'plan'    && (currentAgent === 'planner' || currentAgent === 'itinerary')) ||
    (tab === 'flights' && currentAgent === 'flight') ||
    (tab === 'hotels'  && currentAgent === 'hotel')
  )

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
      {isWorking ? (
        <>
          <Loader2 className="h-8 w-8 text-primary/60 animate-spin mb-3" />
          <p className="text-[13px] text-muted-foreground">
            {tab === 'plan' ? 'Building your itinerary…' : tab === 'flights' ? 'Searching for flights…' : 'Searching for hotels…'}
          </p>
        </>
      ) : (
        <>
          <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center mb-3">
            {tab === 'plan'    && <CalendarDays className="h-5 w-5 text-muted-foreground/50" />}
            {tab === 'flights' && <Plane        className="h-5 w-5 text-muted-foreground/50" />}
            {tab === 'hotels'  && <Hotel        className="h-5 w-5 text-muted-foreground/50" />}
          </div>
          <p className="text-[12px] text-muted-foreground">
            {tab === 'plan'    && 'Your day-by-day itinerary will appear here once the planner builds it.'}
            {tab === 'flights' && 'Flight options will appear here once the flight agent searches.'}
            {tab === 'hotels'  && 'Hotel options will appear here once the hotel agent searches.'}
          </p>
        </>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ChatSidePanel({ isOpen, onToggle, messages, isStreaming, streamingMessage, currentAgent }: ChatSidePanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('plan')
  const { itinerary, isStreamingItinerary, flights, hotels } = useWorkspaceData(messages, streamingMessage, currentAgent)

  return (
    <>
      {/* Overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
          aria-hidden
        />
      )}

      {/* Panel */}
      <aside
        className={cn(
          'flex flex-col shrink-0 bg-background border-l border-border z-30',
          'transition-all duration-300 ease-in-out overflow-hidden',
          // Mobile: full-width overlay from right
          'fixed inset-y-0 right-0 w-[min(420px,100vw)] lg:static lg:inset-auto',
          isOpen ? 'translate-x-0 shadow-2xl lg:shadow-none' : 'translate-x-full lg:translate-x-0 lg:w-0 lg:border-l-0',
          // Desktop: inline panel with width transition
          isOpen ? 'lg:w-[420px]' : 'lg:w-0',
        )}
        aria-label="Trip Workspace"
      >
        {/* Prevent content flash when panel is closing on desktop */}
        <div className={cn('flex flex-col h-full w-[420px]', !isOpen && 'lg:invisible')}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Trip Workspace</span>
              {isStreaming && currentAgent && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  {currentAgent} agent working…
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Close workspace"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab bar */}
          <TabBar
            active={activeTab}
            onChange={setActiveTab}
            hasPlan={!!itinerary}
            hasFlights={flights.length > 0}
            hasHotels={hotels.length > 0}
          />

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'plan' && (
              itinerary
                ? <ItineraryCanvas itinerary={itinerary} />
                : <EmptyState tab="plan" isStreaming={isStreaming} currentAgent={currentAgent} />
            )}

            {activeTab === 'flights' && (
              flights.length > 0
                ? (
                  <div className="space-y-3">
                    <p className="text-[11px] text-muted-foreground mb-2">{flights.length} option{flights.length !== 1 ? 's' : ''} found</p>
                    {flights.map((f, i) => (
                      <FlightSummaryCard key={i} data={f} />
                    ))}
                  </div>
                )
                : <EmptyState tab="flights" isStreaming={isStreaming} currentAgent={currentAgent} />
            )}

            {activeTab === 'hotels' && (
              hotels.length > 0
                ? (
                  <div className="space-y-3">
                    <p className="text-[11px] text-muted-foreground mb-2">{hotels.length} option{hotels.length !== 1 ? 's' : ''} found</p>
                    {hotels.map((h, i) => (
                      <HotelSummaryCard key={i} data={h} />
                    ))}
                  </div>
                )
                : <EmptyState tab="hotels" isStreaming={isStreaming} currentAgent={currentAgent} />
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

// ── Mini flight card ───────────────────────────────────────────────────────────

function FlightSummaryCard({ data }: { data: unknown }) {
  const f = data as Record<string, unknown>
  const airline = String(f.airline ?? f.carrier ?? '')
  const origin = String(f.origin ?? f.origin_airport ?? f.from ?? '')
  const destination = String(f.destination ?? f.destination_airport ?? f.to ?? '')
  const rawPrice = f.price_usd ?? f.price ?? f.total_price
  const price = rawPrice != null ? String(rawPrice) : null
  const dep = String(f.departure_time ?? f.departure ?? '')

  return (
    <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2.5 text-[13px]">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-foreground">{airline || 'Flight'}</span>
        {price && <span className="font-semibold text-primary">${price}</span>}
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground text-[12px]">
        <span>{origin}</span>
        <Plane className="h-3 w-3 -rotate-45" />
        <span>{destination}</span>
        {dep && <span className="ml-auto">{dep.split('T')[1]?.slice(0, 5) ?? dep}</span>}
      </div>
    </div>
  )
}

// ── Mini hotel card ────────────────────────────────────────────────────────────

function HotelSummaryCard({ data }: { data: unknown }) {
  const h = data as Record<string, unknown>
  const name = String(h.name ?? h.hotel_name ?? '')
  const city = String(h.city ?? '')
  const rawPrice = h.price_usd ?? h.total_price_usd ?? h.price
  const price = rawPrice != null ? String(rawPrice) : null
  const rating = h.rating ?? h.stars

  return (
    <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2.5 text-[13px]">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-foreground line-clamp-1">{name || 'Hotel'}</span>
        {price && <span className="font-semibold text-primary">${price}</span>}
      </div>
      <div className="flex items-center gap-2 text-muted-foreground text-[12px]">
        {city && <span>{city}</span>}
        {rating != null && <span>⭐ {Number(rating).toFixed(1)}</span>}
      </div>
    </div>
  )
}

// Keep the old export type for backwards compatibility
export type { ChatSidePanelProps as ChatSidePanelPropsType }
export interface ChatArtifactItem {
  id: string
  label: string
  messageId: string
  createdAt: string
  data?: unknown
}
