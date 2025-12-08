import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

export function Message({ role, content, createdAt, isStreaming, onRegenerate }: MessageProps) {
  const isUser = role === 'user';
  const [isHovered, setIsHovered] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div 
      className={cn(
        "group flex w-full gap-4 p-4 hover:bg-muted/50 transition-colors", 
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={isUser ? "/user-avatar.png" : "/bot-avatar.png"} />
        <AvatarFallback>{isUser ? "U" : "AI"}</AvatarFallback>
      </Avatar>
      
      <div className={cn(
        "flex max-w-[85%] flex-col gap-2",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "prose prose-sm dark:prose-invert break-words max-w-none",
          isUser ? "bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-sm" : "text-foreground"
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block ml-1 animate-pulse">▊</span>
          )}
        </div>
        
        <div className={cn(
          "flex items-center gap-2 opacity-0 transition-opacity",
          isHovered && "opacity-100"
        )}>
          {createdAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(createdAt).toLocaleTimeString()}
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard}>
            <Copy className="h-3 w-3" />
          </Button>
          {!isUser && onRegenerate && !isStreaming && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRegenerate}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
