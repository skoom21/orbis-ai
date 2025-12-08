'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useChatStream } from '@/hooks/use-chat-stream';
import { apiClient } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';
import { MessagesView } from './messages/messages-view';
import { ChatForm } from './input/chat-form';

const ChatHeader = ({ title }: { title: string }) => (
  <div className="p-4 border-b border-border font-semibold bg-background text-foreground flex items-center justify-between">
    <span className="font-serif text-lg">{title}</span>
    <span className="text-xs text-muted-foreground">Gemini 2.0 Flash</span>
  </div>
);

export function ChatView() {
  const { id } = useParams();
  const conversationId = id as string;
  const { session } = useAuth();
  
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => apiClient.getMessages(conversationId),
    enabled: !!conversationId && !!session?.access_token,
  });

  // Fetch conversation details
  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => apiClient.getConversation(conversationId),
    enabled: !!conversationId && !!session?.access_token,
  });

  // Chat streaming hook
  const { sendMessage, isStreaming, streamingMessage, regenerateLastMessage, stopStreaming } = useChatStream({
    conversationId,
    onError: (error) => {
      console.error('[ChatView] Stream error:', error)
    },
  });

  if (messagesLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground rounded-lg shadow-sm border border-border overflow-hidden">
      <ChatHeader title={conversation?.title || 'Chat'} />
      <MessagesView 
        messages={messages || []} 
        streamingMessage={streamingMessage}
        onRegenerate={regenerateLastMessage}
      />
      <ChatForm 
        onSend={sendMessage} 
        isLoading={isStreaming}
        onStop={stopStreaming}
      />
    </div>
  );
}
