import React, { useEffect, useRef } from 'react';
import { Message } from './message';

interface MessagesViewProps {
  messages: any[];
  streamingMessage?: string;
  onRegenerate?: () => void;
}

export function MessagesView({ messages, streamingMessage, onRegenerate }: MessagesViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages?.length === 0 && !streamingMessage && (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          No messages yet. Start the conversation!
        </div>
      )}
      {messages?.map((msg) => (
        <Message 
          key={msg.id} 
          role={msg.role} 
          content={msg.content} 
          createdAt={msg.created_at}
          onRegenerate={onRegenerate}
        />
      ))}
      {streamingMessage && (
        <Message 
          role="assistant" 
          content={streamingMessage} 
          createdAt={new Date().toISOString()}
          isStreaming
        />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
