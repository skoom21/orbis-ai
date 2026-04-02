import React, { useMemo, useRef, useEffect, useState, useCallback, useId } from 'react';
import { Send, Paperclip, Square, ChevronUp, ChevronDown, X, FileText, Loader2, FolderUp, ClipboardPaste, Mic, MicOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatFormContext, useChatSettingsContext } from '../providers';
import type { DraftAttachment } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatFormProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onStop?: () => void;
  autoFocus?: boolean;
  commandCapabilities?: {
    slash?: boolean;
    mentions?: boolean;
    plus?: boolean;
  };
  attachmentCapabilities?: {
    enabled?: boolean;
    maxFiles?: number;
    maxFileSizeMb?: number;
    acceptedTypes?: string[];
  };
  voiceCapabilities?: {
    enabled?: boolean;
    autoSendDefault?: boolean;
  };
}

interface CommandOption {
  id: string
  trigger: '/' | '@' | '+'
  label: string
  description: string
  insertText: string
}

const PLACEHOLDERS = [
  'Message Orbis...',
  'Ask for flights, hotels, or itinerary ideas...',
  'Where should I go next weekend?',
]

const COMMAND_OPTIONS: CommandOption[] = [
  {
    id: 'trip-plan',
    trigger: '/',
    label: 'plan',
    description: 'Generate a complete trip plan',
    insertText: 'Plan a complete 7-day trip for ',
  },
  {
    id: 'budget',
    trigger: '/',
    label: 'budget',
    description: 'Create a budget estimate',
    insertText: 'Create a travel budget for ',
  },
  {
    id: 'hotels',
    trigger: '/',
    label: 'hotels',
    description: 'Find hotel suggestions',
    insertText: 'Find hotel options in ',
  },
  {
    id: 'agent-local',
    trigger: '@',
    label: 'local-guide',
    description: 'Route to local expertise style',
    insertText: '@local-guide ',
  },
  {
    id: 'agent-budget',
    trigger: '@',
    label: 'budget-advisor',
    description: 'Route to budget-focused assistant style',
    insertText: '@budget-advisor ',
  },
  {
    id: 'attach-context',
    trigger: '+',
    label: 'add context',
    description: 'Attach extra constraints to your prompt',
    insertText: 'Additional context: ',
  },
]

const DEFAULT_ATTACHMENT_CAPABILITIES = {
  enabled: true,
  maxFiles: 6,
  maxFileSizeMb: 15,
  acceptedTypes: ['image/', 'application/pdf', 'text/'],
}

export function ChatForm({
  onSend,
  isLoading,
  onStop,
  autoFocus = true,
  commandCapabilities = { slash: true, mentions: true, plus: true },
  attachmentCapabilities,
  voiceCapabilities,
}: ChatFormProps) {
  const { draft, setDraft, attachments, setAttachments } = useChatFormContext();
  const { settings, setSetting } = useChatSettingsContext()
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const [showControls, setShowControls] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandTrigger, setCommandTrigger] = useState<'/' | '@' | '+' | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [voiceAutoSend, setVoiceAutoSend] = useState(settings.voiceAutoSend);
  const recognitionRef = useRef<any>(null);
  const helperTextId = useId();
  const commandListboxId = useId();
  const controlsId = useId();

  const attachmentConfig = {
    ...DEFAULT_ATTACHMENT_CAPABILITIES,
    ...(attachmentCapabilities || {}),
  }

  const isVoiceEnabled = settings.voiceInput && voiceCapabilities?.enabled !== false

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSpeechRecognitionSupported(
      ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)
    )
  }, [])

  const placeholder = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return PLACEHOLDERS[1];
    if (hour < 18) return PLACEHOLDERS[0];
    return PLACEHOLDERS[2];
  }, []);

  const hasSendableAttachment = attachments.some((attachment) => attachment.status !== 'failed')
  const canSend = (draft.trim().length > 0 || hasSendableAttachment) && !isLoading;
  const attachmentLiveSummary = useMemo(() => {
    if (attachments.length === 0) return 'No attachments selected.'
    const uploading = attachments.filter((attachment) => attachment.status === 'uploading').length
    const failed = attachments.filter((attachment) => attachment.status === 'failed').length
    return `${attachments.length} attachment${attachments.length === 1 ? '' : 's'} selected. ${uploading} uploading. ${failed} failed.`
  }, [attachments])

  const isTriggerEnabled = useCallback(
    (trigger: '/' | '@' | '+') => {
      if (trigger === '/') {
        return settings.slashCommands && commandCapabilities.slash !== false;
      }
      if (trigger === '@') {
        return settings.mentionCommands && commandCapabilities.mentions !== false;
      }
      return settings.plusCommands && commandCapabilities.plus !== false;
    },
    [commandCapabilities, settings.mentionCommands, settings.plusCommands, settings.slashCommands]
  );

  useEffect(() => {
    setVoiceAutoSend(settings.voiceAutoSend)
  }, [settings.voiceAutoSend])

  const filteredCommands = useMemo(() => {
    if (!commandTrigger || !isTriggerEnabled(commandTrigger)) return [];
    const options = COMMAND_OPTIONS.filter((option) => option.trigger === commandTrigger);
    if (!commandQuery.trim()) return options;
    const query = commandQuery.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [commandTrigger, commandQuery, isTriggerEnabled]);

  const isFileTypeAccepted = useCallback(
    (file: File) => {
      return attachmentConfig.acceptedTypes.some((acceptedType) => {
        if (acceptedType.endsWith('/')) {
          return file.type.startsWith(acceptedType)
        }
        return file.type === acceptedType
      })
    },
    [attachmentConfig.acceptedTypes]
  )

  const finishUpload = useCallback(
    (attachmentId: string) => {
      const interval = uploadIntervalsRef.current.get(attachmentId)
      if (interval) {
        clearInterval(interval)
        uploadIntervalsRef.current.delete(attachmentId)
      }
      setAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? { ...attachment, status: 'ready', progress: 100 }
            : attachment
        )
      )
    },
    [setAttachments]
  )

  const addAttachments = useCallback(
    (files: File[]) => {
      if (!attachmentConfig.enabled || files.length === 0) return;

      setAttachmentError(null)

      const remainingSlots = Math.max(attachmentConfig.maxFiles - attachments.length, 0)
      if (remainingSlots === 0) {
        setAttachmentError(`Maximum ${attachmentConfig.maxFiles} attachments allowed.`)
        return
      }

      const selectedFiles = files.slice(0, remainingSlots)
      const rejectedCount = files.length - selectedFiles.length

      const maxFileSizeBytes = attachmentConfig.maxFileSizeMb * 1024 * 1024
      const validFiles: File[] = []
      const rejectedReasons: string[] = []

      for (const file of selectedFiles) {
        if (!isFileTypeAccepted(file)) {
          rejectedReasons.push(`${file.name}: unsupported file type`)
          continue
        }
        if (file.size > maxFileSizeBytes) {
          rejectedReasons.push(`${file.name}: exceeds ${attachmentConfig.maxFileSizeMb}MB`)
          continue
        }
        validFiles.push(file)
      }

      if (rejectedCount > 0) {
        rejectedReasons.push(`${rejectedCount} file(s) ignored due to max file limit`)
      }

      if (rejectedReasons.length > 0) {
        setAttachmentError(rejectedReasons[0])
      }

      if (validFiles.length === 0) {
        return
      }

      const nextAttachments: DraftAttachment[] = validFiles.map((file) => {
        const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const interval = setInterval(() => {
          setAttachments((current) =>
            current.map((attachment) =>
              attachment.id === id
                ? {
                    ...attachment,
                    progress: Math.min(attachment.progress + 18, 100),
                  }
                : attachment
            )
          );
        }, 120 + Math.floor(Math.random() * 50));

        uploadIntervalsRef.current.set(id, interval);
        return {
          id,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          status: 'uploading',
          progress: 8,
          file,
        };
      });

      setAttachments((current) => [...current, ...nextAttachments]);

      for (const attachment of nextAttachments) {
        const doneTimeout = setTimeout(() => finishUpload(attachment.id), 900 + Math.floor(Math.random() * 900))
        window.setTimeout(() => clearTimeout(doneTimeout), 3000)
      }
    },
    [attachmentConfig, attachments.length, finishUpload, isFileTypeAccepted, setAttachments]
  );

  const removeAttachment = useCallback(
    (attachmentId: string) => {
      const interval = uploadIntervalsRef.current.get(attachmentId);
      if (interval) {
        clearInterval(interval);
        uploadIntervalsRef.current.delete(attachmentId);
      }
      setAttachments((current) =>
        current.filter((attachment) => attachment.id !== attachmentId)
      );
    },
    [setAttachments]
  );

  const clearAllAttachments = useCallback(() => {
    for (const interval of uploadIntervalsRef.current.values()) {
      clearInterval(interval);
    }
    uploadIntervalsRef.current.clear();
    setAttachments([]);
    setAttachmentError(null)
  }, [setAttachments]);

  useEffect(() => {
    if (!autoFocus) return
    textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!isVoiceEnabled || !speechRecognitionSupported) return

    const RecognitionConstructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!RecognitionConstructor) return

    const recognition = new RecognitionConstructor()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript
      }
      const normalized = transcript.trim()
      if (!normalized) return
      setDraft((current) => (current ? `${current.trimEnd()} ${normalized}` : normalized))
      if (voiceAutoSend && event.results[event.results.length - 1]?.isFinal) {
        onSend(normalized)
        setDraft('')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [isVoiceEnabled, onSend, setDraft, speechRecognitionSupported, voiceAutoSend])

  useEffect(() => {
    return () => {
      for (const interval of uploadIntervalsRef.current.values()) {
        clearInterval(interval);
      }
      uploadIntervalsRef.current.clear();
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (canSend) {
      const outgoingMessage = draft.trim().length > 0 ? draft : 'Please analyze the attached files.';
      onSend(outgoingMessage);
      setDraft('');
      clearAllAttachments();
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (commandOpen && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveCommandIndex((current) => (current + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveCommandIndex((current) =>
          current === 0 ? filteredCommands.length - 1 : current - 1
        );
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[activeCommandIndex];
        if (selected) {
          setDraft(selected.insertText);
          setCommandOpen(false);
          setCommandQuery('');
          setCommandTrigger(null);
        }
        return;
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
        setCommandQuery('');
        setCommandTrigger(null);
        return;
      }
    }

    if (settings.enterToSend && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDraft(value);

    const tokenMatch = value.match(/(?:^|\s)([\/@+])([^\s]*)$/);
    if (tokenMatch && isTriggerEnabled(tokenMatch[1] as '/' | '@' | '+')) {
      const trigger = tokenMatch[1] as '/' | '@' | '+';
      const query = tokenMatch[2] || '';
      setCommandOpen(true);
      setCommandTrigger(trigger);
      setCommandQuery(query);
      setActiveCommandIndex(0);
    } else {
      setCommandOpen(false);
      setCommandQuery('');
      setCommandTrigger(null);
    }

    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!attachmentConfig.enabled) return
    const files = Array.from(e.target.files || []);
    addAttachments(files);
    e.target.value = '';
  };

  const toggleListening = () => {
    if (!isVoiceEnabled || !speechRecognitionSupported) return

    const recognition = recognitionRef.current
    if (!recognition) return

    if (isListening) {
      recognition.stop()
      setIsListening(false)
      return
    }

    recognition.start()
    setIsListening(true)
  }

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="mx-auto w-full max-w-4xl bg-background p-4">
      <div className="sr-only" aria-live="polite">{attachmentLiveSummary}</div>
      <div className="sr-only" aria-live="polite">{isListening ? 'Voice input started.' : 'Voice input stopped.'}</div>
      <form
        onSubmit={handleSubmit}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isLoading && attachmentConfig.enabled) setIsDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          const related = e.relatedTarget as Node | null;
          if (!related || !e.currentTarget.contains(related)) {
            setIsDragActive(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          if (isLoading || !attachmentConfig.enabled) return;
          const files = Array.from(e.dataTransfer.files || []);
          addAttachments(files);
        }}
        className={cn(
          'relative flex w-full flex-col rounded-2xl border border-input bg-card p-3 shadow-sm transition-all focus-within:ring-1 focus-within:ring-ring',
          isDragActive && 'border-primary ring-1 ring-primary/40'
        )}
        aria-label="Chat composer"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept={attachmentConfig.acceptedTypes.join(',')}
          onChange={handleFileInputChange}
        />

        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2" role="list" aria-label="Selected attachments">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs"
                role="listitem"
              >
                {attachment.status === 'uploading' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : attachment.status === 'failed' ? (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="max-w-28 truncate text-foreground">{attachment.name}</span>
                <span className="text-muted-foreground">
                  {formatFileSize(attachment.size)}
                  {attachment.status === 'uploading' ? ` • ${attachment.progress}%` : ''}
                </span>
                <button
                  type="button"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-background"
                  onClick={() => removeAttachment(attachment.id)}
                  aria-label={attachment.status === 'uploading' ? `Cancel ${attachment.name}` : `Remove ${attachment.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-full px-2 text-xs"
              onClick={clearAllAttachments}
              aria-label="Clear all attachments"
            >
              Clear all
            </Button>
          </div>
        )}

        {attachmentError && (
          <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive" role="alert">
            {attachmentError}
          </div>
        )}

        {isDragActive && (
          <div className="mb-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-center text-xs text-primary" role="status" aria-live="polite">
            Drop files here to attach
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent px-2 py-2 min-h-11 max-h-[200px] focus:outline-none text-foreground placeholder:text-muted-foreground"
          rows={1}
          disabled={isLoading}
          aria-label="Message input"
          aria-describedby={helperTextId}
          aria-controls={commandOpen ? commandListboxId : undefined}
          aria-expanded={commandOpen}
          aria-autocomplete="list"
        />
        <span id={helperTextId} className="sr-only">
          {settings.enterToSend ? 'Press Enter to send and Shift Enter for a new line.' : 'Press Shift Enter to send and Enter for a new line.'}
        </span>

        {commandOpen && filteredCommands.length > 0 && (
          <div
            id={commandListboxId}
            role="listbox"
            aria-label="Command suggestions"
            className="absolute inset-x-3 top-[calc(100%+0.4rem)] z-20 rounded-xl border border-border bg-popover p-1 shadow-lg"
          >
            {filteredCommands.map((command, index) => (
              <button
                key={command.id}
                type="button"
                onClick={() => {
                  setDraft(command.insertText);
                  setCommandOpen(false);
                  setCommandQuery('');
                  setCommandTrigger(null);
                }}
                className={cn(
                  'flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left',
                  index === activeCommandIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                )}
                role="option"
                aria-selected={index === activeCommandIndex}
              >
                <span className="mt-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                  {command.trigger}
                </span>
                <span>
                  <span className="block text-xs font-medium">{command.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{command.description}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {showControls && (
          <div id={controlsId} className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Attach file"
                    disabled={isLoading || !attachmentConfig.enabled}
                  >
                    <Paperclip className="h-5 w-5" />
                    <span className="sr-only">Attach file</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <FolderUp className="h-4 w-4" />
                    Upload files
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setAttachmentError('Paste attachments from clipboard is coming soon.')}
                  >
                    <ClipboardPaste className="h-4 w-4" />
                    Paste from clipboard
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                size="icon"
                variant={isListening ? 'default' : 'ghost'}
                className="h-8 w-8"
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                disabled={isLoading || !isVoiceEnabled || !speechRecognitionSupported}
                onClick={toggleListening}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              <Button
                type="button"
                variant={voiceAutoSend ? 'outline' : 'ghost'}
                size="sm"
                className="hidden h-7 px-2 text-[11px] md:inline-flex"
                disabled={!isVoiceEnabled || !speechRecognitionSupported}
                onClick={() => {
                  setVoiceAutoSend((current) => {
                    const next = !current
                    setSetting('voiceAutoSend', next)
                    return next
                  })
                }}
              >
                Auto-send voice
              </Button>
              <span className="hidden text-xs text-muted-foreground md:inline">
                {settings.enterToSend ? 'Enter to send • Shift+Enter for new line' : 'Shift+Enter to send • Enter for new line'}
              </span>
            </div>

            {isLoading && onStop ? (
              <Button
                type="button"
                onClick={onStop}
                size="icon"
                className="h-8 w-8 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                aria-label="Stop generating"
              >
                <Square className="h-4 w-4" />
                <span className="sr-only">Stop generating</span>
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!canSend}
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  canSend ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            )}
          </div>
        )}

        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setShowControls((current) => !current)}
            aria-label={showControls ? 'Collapse input actions' : 'Expand input actions'}
            aria-expanded={showControls}
            aria-controls={controlsId}
          >
            {showControls ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>

      </form>
      <div className="text-center text-xs text-muted-foreground mt-2">
        Gemini can make mistakes. Consider checking important information.
      </div>
    </div>
  );
}
