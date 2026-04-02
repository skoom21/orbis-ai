import React, { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link2, Wrench, FileText } from 'lucide-react'
import type { MessageContentPart, MessageSourceItem, MessageAttachmentItem } from '../types'

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
    default:
      return null
  }
}

export function parseMessageParts(content: string): MessageContentPart[] {
  const trimmed = content.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return [{ type: 'markdown', markdown: content }]
  }

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
            <ReactMarkdown key={`md-${index}`} remarkPlugins={[remarkGfm]}>
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
