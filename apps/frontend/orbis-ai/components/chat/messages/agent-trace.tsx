'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Loader2,
  Plane,
  Hotel,
  Map,
  CalendarDays,
  CreditCard,
  ShieldCheck,
  Search,
  Database,
  Plus,
  PenLine,
  Bookmark,
  Info,
  Zap,
} from 'lucide-react'
import type { AgentTraceStep } from '@/hooks/use-chat-stream'

// ─── Agent colours & icons ───────────────────────────────────────────────────

const AGENT_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  flight:    { icon: <Plane className="h-3.5 w-3.5" />,       color: 'text-sky-400',    bg: 'bg-sky-500/10 border-sky-500/20' },
  hotel:     { icon: <Hotel className="h-3.5 w-3.5" />,       color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  planner:   { icon: <Map className="h-3.5 w-3.5" />,         color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20' },
  itinerary: { icon: <CalendarDays className="h-3.5 w-3.5" />,color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  booking:   { icon: <CreditCard className="h-3.5 w-3.5" />,  color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  verifier:  { icon: <ShieldCheck className="h-3.5 w-3.5" />, color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20' },
}

// ─── Tool icons ──────────────────────────────────────────────────────────────

function toolIcon(tool: string): React.ReactNode {
  if (tool.startsWith('search_') || tool.startsWith('get_')) return <Search className="h-3 w-3" />
  if (tool.startsWith('create_')) return <Plus className="h-3 w-3" />
  if (tool.startsWith('update_')) return <PenLine className="h-3 w-3" />
  if (tool.includes('book')) return <Bookmark className="h-3 w-3" />
  if (tool.includes('prebook')) return <Bookmark className="h-3 w-3" />
  return <Database className="h-3 w-3" />
}

// ─── Human-readable tool input summary ───────────────────────────────────────

function summariseInput(tool: string, input?: Record<string, unknown>): string {
  if (!input || Object.keys(input).length === 0) return ''
  switch (tool) {
    case 'search_flights':
      return [input.origin, '→', input.destination, input.departure_date].filter(Boolean).join(' ')
    case 'search_hotels':
      return [input.city, input.check_in ? `${input.check_in} → ${input.check_out}` : ''].filter(Boolean).join(' · ')
    case 'get_user_preferences':
    case 'get_travel_history':
      return ''
    case 'search_destinations':
    case 'search_attractions':
    case 'search_airports':
      return String(input.query || input.city || '').slice(0, 40)
    case 'get_airport_info':
      return String(input.query || '').slice(0, 40)
    case 'create_trip':
      return String(input.title || input.destination || '').slice(0, 40)
    case 'create_booking':
      return String(input.booking_type || '').slice(0, 40)
    default: {
      const vals = Object.values(input).slice(0, 2).map((v) => String(v).slice(0, 25))
      return vals.join(', ')
    }
  }
}

// ─── Status icon ─────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: AgentTraceStep['status'] }) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
    case 'done':
    case 'success':
      return <Check className="h-3 w-3 text-emerald-400" />
    case 'warning':
      return <AlertTriangle className="h-3 w-3 text-amber-400" />
    case 'error':
      return <AlertTriangle className="h-3 w-3 text-destructive" />
  }
}

// ─── Individual tool card ────────────────────────────────────────────────────

function ToolCard({ step }: { step: AgentTraceStep }) {
  const [expanded, setExpanded] = useState(false)
  const inputSummary = summariseInput(step.tool ?? '', step.input)
  const hasDetails = !!inputSummary || !!step.outputPreview

  return (
    <div
      className={cn(
        'rounded-lg border bg-background/50 px-3 py-2 text-xs transition-all',
        step.status === 'running' && 'border-border/60',
        step.status === 'success' && 'border-emerald-500/20',
        step.status === 'error'   && 'border-destructive/30',
        step.status === 'warning' && 'border-amber-500/20',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground shrink-0">{toolIcon(step.tool ?? '')}</span>
          <span className="font-mono text-[11px] text-foreground/80 truncate">{step.tool}</span>
          {inputSummary && (
            <span className="text-muted-foreground truncate hidden sm:block">— {inputSummary}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusIcon status={step.status} />
          {hasDetails && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
          {inputSummary && (
            <div>
              <span className="text-muted-foreground">Input: </span>
              <span className="text-foreground/70">{inputSummary}</span>
            </div>
          )}
          {step.outputPreview && (
            <div>
              <span className="text-muted-foreground">Output: </span>
              <span className="text-foreground/60 line-clamp-3">{step.outputPreview}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step pill ───────────────────────────────────────────────────────────────

function StepPill({ step }: { step: AgentTraceStep }) {
  const isWarning = step.status === 'warning'
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        step.status === 'running' && 'border-border/60 bg-muted/40 text-muted-foreground',
        (step.status === 'done' || step.status === 'success') && 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
        isWarning && 'border-amber-500/20 bg-amber-500/5 text-amber-400',
        step.status === 'error' && 'border-destructive/30 bg-destructive/5 text-destructive',
      )}
    >
      <StatusIcon status={step.status} />
      {step.label}
    </div>
  )
}

// ─── Agent badge ─────────────────────────────────────────────────────────────

function AgentBadge({ step }: { step: AgentTraceStep }) {
  const meta = AGENT_META[step.agentType ?? ''] ?? {
    icon: <Zap className="h-3.5 w-3.5" />,
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
  }
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        meta.bg,
        meta.color,
      )}
    >
      {meta.icon}
      {step.label}
      {step.status === 'running' && (
        <Loader2 className="h-3 w-3 animate-spin opacity-70 ml-0.5" />
      )}
    </div>
  )
}

// ─── Agent pipeline (multi-agent handoff) ────────────────────────────────────

function AgentPipeline({ agents }: { agents: AgentTraceStep[] }) {
  if (agents.length < 2) return null
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {agents.map((a, i) => {
        const meta = AGENT_META[a.agentType ?? ''] ?? { icon: <Zap className="h-3 w-3" />, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' }
        const isDone = a.status === 'done' || a.status === 'success'
        const isRunning = a.status === 'running'
        return (
          <React.Fragment key={a.id}>
            {i > 0 && <ChevronDown className="h-3 w-3 text-muted-foreground/40 -rotate-90 shrink-0" />}
            <div className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold', meta.bg, meta.color)}>
              {meta.icon}
              <span>{a.label}</span>
              {isDone && <Check className="h-2.5 w-2.5 ml-0.5 opacity-70" />}
              {isRunning && <Loader2 className="h-2.5 w-2.5 ml-0.5 animate-spin opacity-70" />}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Main AgentTrace component ────────────────────────────────────────────────

interface AgentTraceProps {
  steps: AgentTraceStep[]
  isStreaming: boolean
  /** True once text tokens have started arriving — trace should collapse */
  hasContent: boolean
}

export function AgentTrace({ steps, isStreaming, hasContent }: AgentTraceProps) {
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null)

  if (steps.length === 0) return null

  // Auto-collapse logic: collapse once text is streaming, unless user explicitly toggled.
  const autoCollapsed = hasContent && isStreaming
  const isCollapsed = userExpanded === null ? autoCollapsed : !userExpanded

  const stepPills  = steps.filter((s) => s.type === 'step')
  const agentSteps = steps.filter((s) => s.type === 'agent')
  const toolSteps  = steps.filter((s) => s.type === 'tool')

  const activeAgent = agentSteps[agentSteps.length - 1]
  const toolCount   = toolSteps.length
  const runningTool = toolSteps.find((s) => s.status === 'running')
  const isMultiAgent = agentSteps.length > 1

  return (
    <div
      className={cn(
        'mb-3 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden',
        'transition-all duration-300',
      )}
      role="status"
      aria-label="Agent activity"
      aria-live="polite"
    >
      {/* ── Header row (always visible) ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setUserExpanded(isCollapsed)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={!isCollapsed}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Multi-agent pipeline or single agent badge */}
          {isMultiAgent
            ? <AgentPipeline agents={agentSteps} />
            : activeAgent && <AgentBadge step={activeAgent} />}

          {/* Collapsed summary */}
          {isCollapsed && !isMultiAgent && (
            <span className="text-[11px] text-muted-foreground">
              {runningTool
                ? runningTool.label
                : toolCount > 0
                  ? `${toolCount} tool${toolCount !== 1 ? 's' : ''} used`
                  : stepPills[stepPills.length - 1]?.label ?? 'Processing'}
            </span>
          )}

          {/* Expanded: show step pills inline */}
          {!isCollapsed && !isMultiAgent && stepPills.map((s) => <StepPill key={s.id} step={s} />)}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isStreaming && !runningTool && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Thinking
            </span>
          )}
          <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
          {isCollapsed
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronUp   className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* ── Expanded body ───────────────────────────────────────────── */}
      {!isCollapsed && (
        <div className="border-t border-border/40 px-3 py-2.5 space-y-2">
          {/* Step pills when multi-agent expanded */}
          {isMultiAgent && stepPills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/30">
              {stepPills.map((s) => <StepPill key={s.id} step={s} />)}
            </div>
          )}
          {toolSteps.length > 0 ? (
            <div className="space-y-1.5">
              {toolSteps.map((s) => <ToolCard key={s.id} step={s} />)}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">
              No tool calls yet — waiting for agent to start.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
