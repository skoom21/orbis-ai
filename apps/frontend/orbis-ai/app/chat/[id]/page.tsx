import { ChatView } from '@/components/chat/chat-view';

export default function ChatPage() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full h-full max-w-6xl">
        <ChatView />
      </div>
    </div>
  );
}
