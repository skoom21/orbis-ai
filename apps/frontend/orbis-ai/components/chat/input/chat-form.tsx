import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatFormProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onStop?: () => void;
}

export function ChatForm({ onSend, isLoading, onStop }: ChatFormProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="p-4 bg-background w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="relative flex flex-col w-full p-3 border border-input rounded-2xl shadow-sm bg-card focus-within:ring-1 focus-within:ring-ring transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Message Gemini Pro..."
          className="w-full resize-none bg-transparent px-2 py-2 min-h-[44px] max-h-[200px] focus:outline-none text-foreground placeholder:text-muted-foreground"
          rows={1}
          disabled={isLoading}
        />
        
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Attach file</span>
            </Button>
          </div>
          
          {isLoading && onStop ? (
            <Button 
              type="button"
              onClick={onStop}
              size="icon" 
              className="h-8 w-8 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Square className="h-4 w-4" />
              <span className="sr-only">Stop generating</span>
            </Button>
          ) : (
            <Button 
              type="submit" 
              size="icon" 
              disabled={isLoading || !input.trim()}
              className={cn(
                "h-8 w-8 rounded-lg transition-all",
                input.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          )}
        </div>
      </form>
      <div className="text-center text-xs text-muted-foreground mt-2">
        Gemini can make mistakes. Consider checking important information.
      </div>
    </div>
  );
}
