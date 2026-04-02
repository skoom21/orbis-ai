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

export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'markdown'; markdown: string }
  | { type: 'tool-call'; name: string; input?: unknown; output?: unknown }
  | { type: 'sources'; items: MessageSourceItem[] }
  | { type: 'search-results'; items: MessageSourceItem[] }
  | { type: 'attachments'; items: MessageAttachmentItem[] }
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
