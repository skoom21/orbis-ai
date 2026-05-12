import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Copy,
  RefreshCw,
  Volume2,
  VolumeX,
  Pencil,
  CornerDownRight,
  GitFork,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { MemoizedMessageContentParts } from './content-parts';

interface MessageProps {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
  footer?: React.ReactNode;
  onRegenerate?: () => void;
  onEditResubmit?: (messageId: string, content: string) => void;
  onContinue?: (messageId: string, content: string) => void;
  onFork?: (messageId: string, content: string) => void;
  onFeedback?: (messageId: string, feedback: 'up' | 'down') => void;
  siblingIndex?: number;
  siblingCount?: number;
  onPrevSibling?: () => void;
  onNextSibling?: () => void;
  actionCapabilities?: {
    copy?: boolean;
    edit?: boolean;
    regenerate?: boolean;
    continue?: boolean;
    fork?: boolean;
    feedback?: boolean;
    audio?: boolean;
  };
}

function MessageComponent({
  id,
  role,
  content,
  createdAt,
  isStreaming,
  footer,
  onRegenerate,
  onEditResubmit,
  onContinue,
  onFork,
  onFeedback,
  siblingIndex = 1,
  siblingCount = 1,
  onPrevSibling,
  onNextSibling,
  actionCapabilities = {
    copy: true,
    edit: true,
    regenerate: true,
    continue: true,
    fork: true,
    feedback: true,
    audio: true,
  },
}: MessageProps) {
  const isUser = role === 'user';
  const [isHovered, setIsHovered] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopyStatus('Message copied to clipboard.')
    } catch {
      setCopyStatus('Failed to copy message.')
    }
    window.setTimeout(() => setCopyStatus(''), 1200)
  };

  const toggleSpeak = () => {
    if (actionCapabilities.audio === false) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(content)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    utteranceRef.current = utterance
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
  }

  useEffect(() => {
    setEditedContent(content)
  }, [content])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      utteranceRef.current = null
    }
  }, [])

  return (
    <div
      className={cn(
        "group flex w-full p-4 sm:p-5 rounded-2xl md:rounded-3xl transition-colors",
        isUser ? "justify-end" : "justify-start",
        footer && !isUser
          ? "bg-muted/30 border border-border/40 hover:bg-muted/40"
          : "hover:bg-muted/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`${role} message`}
    >
      <div className={cn(
        "flex flex-col gap-2 w-full",
        isUser ? "max-w-[85%] sm:max-w-[75%] items-end" : "max-w-full items-start"
      )}>
        <div className={cn(
          "prose prose-sm dark:prose-invert wrap-break-word",
          isUser
            ? "max-w-none bg-primary text-primary-foreground p-3 sm:px-4 rounded-2xl rounded-tr-sm"
            : "max-w-none w-full text-foreground"
        )}>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editedContent}
                onChange={(event) => setEditedContent(event.target.value)}
                className="min-h-24 w-full resize-y rounded-md border border-border bg-background/70 p-2 text-sm text-foreground"
                aria-label="Edit message content"
              />
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditedContent(content)
                    setIsEditing(false)
                  }}
                  aria-label="Cancel edit"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    if (!id || !onEditResubmit) return
                    onEditResubmit(id, editedContent)
                    setIsEditing(false)
                  }}
                  aria-label="Save edit"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : isStreaming && !content.trim() ? (
            <div className="flex items-center gap-1.5 py-1" aria-label="Assistant is thinking">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:240ms]" />
            </div>
          ) : (
            <MemoizedMessageContentParts content={content} />
          )}
          {isStreaming && content.trim() && (
            <span className="inline-block ml-1 animate-pulse">▊</span>
          )}
        </div>

        {footer && !isUser && (
          <div className="w-full mt-3 pt-3 border-t border-border/25">
            {footer}
          </div>
        )}

        <div className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100",
          isHovered && "opacity-100"
        )}>
          {siblingCount > 1 && (
            <div className="mr-1 inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-1 py-0.5">
              <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onPrevSibling}
                aria-label="Previous sibling message"
                disabled={!onPrevSibling}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Previous version</p>
              </TooltipContent>
            </Tooltip>
              <span className="min-w-10 text-center text-[10px] font-medium">
                {siblingIndex} / {siblingCount}
              </span>
              <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onNextSibling}
                aria-label="Next sibling message"
                disabled={!onNextSibling}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Next version</p>
              </TooltipContent>
            </Tooltip>
            </div>
          )}
          {createdAt && (
            <span>
              {new Date(createdAt).toLocaleTimeString()}
            </span>
          )}
          {actionCapabilities.copy !== false && (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={copyToClipboard}
              aria-label="Copy message"
            >
              <Copy className="h-3 w-3" />
            </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy message</p>
              </TooltipContent>
            </Tooltip>
          )}
          {isUser && actionCapabilities.edit !== false && !isStreaming && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsEditing((current) => !current)}
              aria-label="Edit message"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {!isUser && actionCapabilities.audio !== false && !isStreaming && (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={toggleSpeak}
              aria-label={isSpeaking ? 'Stop reading message' : 'Read message aloud'}
            >
              {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isSpeaking ? "Stop reading" : "Read aloud"}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {!isUser && actionCapabilities.regenerate !== false && onRegenerate && !isStreaming && (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRegenerate}
              aria-label="Regenerate response"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Regenerate</p>
              </TooltipContent>
            </Tooltip>
          )}
          {!isUser && actionCapabilities.continue !== false && onContinue && id && !isStreaming && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onContinue(id, content)}
              aria-label="Continue response"
            >
              <CornerDownRight className="h-3 w-3" />
            </Button>
          )}
          {!isUser && actionCapabilities.fork !== false && onFork && id && !isStreaming && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onFork(id, content)}
              aria-label="Fork response"
            >
              <GitFork className="h-3 w-3" />
            </Button>
          )}
          {!isUser && actionCapabilities.feedback !== false && onFeedback && id && !isStreaming && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn('h-6 w-6', feedback === 'up' && 'text-primary')}
                onClick={() => {
                  const next = feedback === 'up' ? null : 'up'
                  setFeedback(next)
                  if (next) onFeedback(id, next)
                }}
                aria-label="Thumbs up"
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn('h-6 w-6', feedback === 'down' && 'text-destructive')}
                onClick={() => {
                  const next = feedback === 'down' ? null : 'down'
                  setFeedback(next)
                  if (next) onFeedback(id, next)
                }}
                aria-label="Thumbs down"
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
        <span className="sr-only" aria-live="polite">{copyStatus}</span>
      </div>
    </div>
  );
}

export const Message = React.memo(MessageComponent)
