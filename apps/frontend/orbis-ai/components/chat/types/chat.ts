export interface ChatConversation {
  id: string
  title: string
  created_at: string
  user_id: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  parent_message_id?: string | null
}

export interface MessageSourceItem {
  title: string
  url?: string
  snippet?: string
}

export interface MessageAttachmentItem {
  name: string
  url?: string
  mimeType?: string
}

export interface HotelResultItem {
  id: string
  name: string
  city?: string
  address?: string
  description?: string
  rating?: number
  stars?: number
  photo?: string
  price?: number
  currency?: string
  roomType?: string
  offerId?: string
  source?: Record<string, unknown>
}

export interface BookingSummaryItem {
  bookingId: string
  status?: string
  hotelName?: string
  totalPrice?: number
  currency?: string
  source?: Record<string, unknown>
}

export interface MessageActionItem {
  id: string
  label: string
  kind: string
  payload?: Record<string, unknown>
}

export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'markdown'; markdown: string }
  | { type: 'tool-call'; name: string; input?: unknown; output?: unknown }
  | { type: 'sources'; items: MessageSourceItem[] }
  | { type: 'search-results'; items: MessageSourceItem[] }
  | { type: 'attachments'; items: MessageAttachmentItem[] }
  | { type: 'hotel-results'; title?: string; subtitle?: string; items: HotelResultItem[]; actions?: MessageActionItem[] }
  | { type: 'booking-update'; title?: string; subtitle?: string; items: BookingSummaryItem[]; actions?: MessageActionItem[] }
  | { type: 'artifact'; label: string; data?: unknown }

export interface DraftAttachment {
  id: string
  name: string
  size: number
  type: string
  status: 'uploading' | 'ready' | 'failed'
  progress: number
  error?: string
  requiresReattach?: boolean
  file?: File
}
