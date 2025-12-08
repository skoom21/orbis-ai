import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ChatIndexPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-4">
      <h1 className="text-2xl font-bold text-gray-800">Select a Conversation</h1>
      <p className="text-gray-500">Choose a chat from the dashboard to start messaging.</p>
      <Link href="/dashboard">
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
}
