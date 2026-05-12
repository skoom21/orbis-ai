export interface ItineraryActivity {
  time: string
  description: string
  type: 'morning' | 'afternoon' | 'evening' | 'note'
}

export interface ItineraryDay {
  day: number
  title: string
  city?: string
  activities: ItineraryActivity[]
  estimatedCost?: string
}

export interface ParsedItinerary {
  title: string
  destination: string
  totalDays: number
  days: ItineraryDay[]
  totalBudget?: string
}

const TIME_LABELS = [
  { pattern: /^(Morning(?:\/Afternoon)?)[:\s]+/i, type: 'morning' as const, label: 'Morning' },
  { pattern: /^(Late\s*Morning)[:\s]+/i,           type: 'morning' as const, label: 'Late Morning' },
  { pattern: /^(Afternoon)[:\s]+/i,                type: 'afternoon' as const, label: 'Afternoon' },
  { pattern: /^(Late\s*Afternoon)[:\s]+/i,         type: 'afternoon' as const, label: 'Late Afternoon' },
  { pattern: /^(Evening|Night)[:\s]+/i,            type: 'evening' as const, label: 'Evening' },
]

function parseDayBlock(block: string, dayNum: number): ItineraryDay {
  const titleMatch = block.match(/Day\s*\d+[\s*:—–-]+([^\n]+)/i)
  const title = titleMatch?.[1]?.replace(/\*\*/g, '').trim() ?? `Day ${dayNum}`

  const cityMatch = title.match(/—\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/) ??
                    title.match(/:\s*(?:Arrival in\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)
  const city = cityMatch?.[1]?.trim()

  const activities: ItineraryActivity[] = []
  let curTime = ''
  let curType: ItineraryActivity['type'] = 'note'
  let curDesc = ''

  const flush = () => {
    const d = curDesc.trim().replace(/\s+/g, ' ')
    if (curTime && d) activities.push({ time: curTime, description: d, type: curType })
    curTime = ''
    curDesc = ''
  }

  for (const raw of block.split('\n')) {
    const line = raw.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').trim()
    if (!line || /^Day\s*\d+/i.test(line)) continue

    let matched = false
    for (const { pattern, label, type } of TIME_LABELS) {
      if (pattern.test(line)) {
        flush()
        curTime = label
        curType = type
        curDesc = line.replace(pattern, '').trim()
        matched = true
        break
      }
    }

    if (!matched) {
      if (curTime && !line.toLowerCase().startsWith('estimated')) {
        curDesc += ' ' + line
      } else if (!curTime && line.length > 15 && !line.toLowerCase().startsWith('estimated')) {
        activities.push({ time: '', description: line, type: 'note' })
      }
    }
  }
  flush()

  const costMatch = block.match(/Estimated Cost[:\s]+([^\n]+)/i)

  return { day: dayNum, title, city, activities: activities.slice(0, 6), estimatedCost: costMatch?.[1]?.trim() }
}

export function parseItineraryFromMarkdown(markdown: string): ParsedItinerary | null {
  if (!markdown) return null
  const dayMatches = [...markdown.matchAll(/(?:##\s*)?Day\s*(\d+)/gi)]
  if (dayMatches.length < 2) return null

  const h1 = markdown.match(/^#\s+(.+?)$/m)?.[1]?.trim()
  const bold = markdown.match(/\n\*\*([^*\n]{10,80})\*\*\n/)?.[1]?.trim()
  const title = h1 ?? bold ?? 'Trip Itinerary'

  const blocks = markdown.split(/(?=(?:##\s*)?Day\s*\d+\s*[:\-–—])/gi).filter(b => /Day\s*\d+/i.test(b))
  const days: ItineraryDay[] = []

  for (const block of blocks) {
    const m = block.match(/Day\s*(\d+)/i)
    if (m) days.push(parseDayBlock(block, parseInt(m[1])))
  }

  if (days.length === 0) return null

  const budgetMatch = markdown.match(/(?:Estimated Total|Total Budget|Total Estimated)[^:]*:\s*([^\n]+)/i)

  return {
    title,
    destination: title.replace(/itinerary|trip|journey|tour|plan/gi, '').trim() || 'Your Destination',
    totalDays: days.length,
    days,
    totalBudget: budgetMatch?.[1]?.trim(),
  }
}
