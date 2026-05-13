'use client'

import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Schema types ──────────────────────────────────────────────────────────────

export interface FormFieldDef {
  type: 'text' | 'date' | 'number'
  key: string
  label: string
  placeholder?: string
  min?: number | string
  max?: number
  default?: string | number
}

export interface DynamicFormSchema {
  title?: string
  fields: FormFieldDef[]
  submit_label?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function addDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function defaultFor(field: FormFieldDef): string {
  if (field.default !== undefined) return String(field.default)
  if (field.type === 'date') {
    const key = field.key.toLowerCase()
    if (key.includes('check') && key.includes('out')) return addDays(10)
    if (key.includes('return')) return addDays(14)
    if (key.includes('check') || key.includes('in') || key.includes('depart') || key.includes('start')) return addDays(7)
    return addDays(7)
  }
  if (field.type === 'number') return '1'
  return ''
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DynamicTravelFormProps {
  schema: DynamicFormSchema
  className?: string
}

export function DynamicTravelForm({ schema, className }: DynamicTravelFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of schema.fields) init[f.key] = defaultFor(f)
    return init
  })
  const [submitted, setSubmitted] = useState(false)

  const set = (key: string, val: string) => setValues((v) => ({ ...v, [key]: val }))

  const handleSubmit = () => {
    const parts = schema.fields
      .map((f) => {
        const raw = values[f.key]?.trim()
        if (!raw) return null
        const display = f.type === 'date' ? formatDate(raw) : raw
        return `${f.label}: ${display}`
      })
      .filter(Boolean)

    if (parts.length === 0) return

    const message = parts.join(', ') + '.'
    window.dispatchEvent(new CustomEvent('orbis:send-message', { detail: { message } }))
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
        <Check className="h-4 w-4 shrink-0" />
        Got it — searching now…
      </div>
    )
  }

  return (
    <div className={cn('animate-in fade-in slide-in-from-bottom-1 duration-200 rounded-2xl border border-border/50 bg-background/80 p-4 backdrop-blur-sm', className)}>
      {schema.title && (
        <p className="mb-3 text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
          {schema.title}
        </p>
      )}

      <div className="flex flex-col gap-3 mb-4">
        {schema.fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              {field.label}
            </label>

            {field.type === 'text' && (
              <input
                type="text"
                value={values[field.key] ?? ''}
                placeholder={field.placeholder ?? ''}
                onChange={(e) => set(field.key, e.target.value)}
                className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}

            {field.type === 'date' && (
              <input
                type="date"
                value={values[field.key] ?? ''}
                min={typeof field.min === 'string' ? field.min : todayStr()}
                onChange={(e) => set(field.key, e.target.value)}
                className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 scheme-dark"
              />
            )}

            {field.type === 'number' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => set(field.key, String(Math.max(Number(field.min ?? 1), (parseInt(values[field.key] ?? '1') || 1) - 1)))}
                  className="h-8 w-8 shrink-0 rounded-full border border-border/60 bg-muted/40 text-foreground hover:bg-muted transition-colors flex items-center justify-center text-sm font-bold"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums">
                  {values[field.key] ?? '1'}
                </span>
                <button
                  type="button"
                  onClick={() => set(field.key, String(Math.min(field.max ?? 99, (parseInt(values[field.key] ?? '1') || 1) + 1)))}
                  className="h-8 w-8 shrink-0 rounded-full border border-border/60 bg-muted/40 text-foreground hover:bg-muted transition-colors flex items-center justify-center text-sm font-bold"
                >
                  +
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button className="w-full rounded-xl h-10 gap-2 text-sm font-medium" onClick={handleSubmit}>
        {schema.submit_label ?? 'Confirm'}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
