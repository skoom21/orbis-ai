const fs = require('fs')
const path = 'components/chat/chat-view.tsx'
let content = fs.readFileSync(path, 'utf8')

// Add useRouter
content = content.replace("import { useParams } from 'next/navigation';", "import { useParams, useRouter } from 'next/navigation';\nimport { useEffect } from 'react';")

// Change ChatViewContent signature
content = content.replace("function ChatViewContent() {", "function ChatViewContent({ isIndex }: { isIndex?: boolean }) {")

// Inside ChatViewContent, modify initialization
content = content.replace(
  "  const { id } = useParams();\n  const conversationId = id as string;",
  `  const { id } = useParams();
  const conversationId = id as string;
  const router = useRouter();
  const [creating, setCreating] = useState(false);`
)

// Add useEffect for init message after hooks
const startOfStreams = "  const { sendMessage, isStreaming, streamingMessage, regenerateLastMessage, stopStreaming } = useChatStream({"
content = content.replace(startOfStreams,
`  // Send initial message from new chat creation
  useEffect(() => {
    if (isIndex || !conversationId) return;
    const initCmd = sessionStorage.getItem('orbis_initial_message');
    if (initCmd && !messagesLoading && !isStreaming) {
      sessionStorage.removeItem('orbis_initial_message');
      setTimeout(() => {
        sendMessage(initCmd);
      }, 50); // slight delay to ensure socket readiness
    }
  }, [conversationId, isIndex, messagesLoading, isStreaming]);

` + startOfStreams)

// Add handleIndexSend before useMemo
const startOfUseMemo = "  const handleContinue = useCallback("
content = content.replace(startOfUseMemo, 
`  const handleIndexSend = useCallback(async (content: string) => {
    if (creating) return;
    setCreating(true);
    try {
      const convo = await apiClient.createConversation('New Trip Chat');
      sessionStorage.setItem('orbis_initial_message', content);
      router.push(\`/chat/\${convo.id}\`);
    } catch (err) {
      console.error('Failed to create new chat:', err);
      setCreating(false);
    }
  }, [creating, router]);

  const effectiveSendMessage = isIndex ? handleIndexSend : sendMessage;
  const effectiveIsStreaming = isIndex ? creating : isStreaming;

  const handleContinue = useCallback(`)

// Replace usages of sendMessage and isStreaming in chatContextValue and below
content = content.replace(
  "      isStreaming,",
  "      isStreaming: effectiveIsStreaming,"
)
content = content.replace(
  "      sendMessage,",
  "      sendMessage: effectiveSendMessage,"
)

// Replace ChatLanding props
content = content.replace(
  `                        onSelectStarter={sendMessage}`,
  `                        onSelectStarter={effectiveSendMessage}`
)

content = content.replace(
  `                          onSend={sendMessage}\n                          isLoading={isStreaming}\n                          onStop={stopStreaming}`,
  `                          onSend={effectiveSendMessage}\n                          isLoading={effectiveIsStreaming}\n                          onStop={stopStreaming}`
)

content = content.replace(
  `                            onSend={sendMessage}\n                            isLoading={isStreaming}\n                            onStop={stopStreaming}`,
  `                            onSend={effectiveSendMessage}\n                            isLoading={effectiveIsStreaming}\n                            onStop={stopStreaming}`
)

// Update ChatView signature
content = content.replace("export function ChatView() {", "export function ChatView({ isIndex }: { isIndex?: boolean }) {")
content = content.replace("<ChatViewContent />", "<ChatViewContent isIndex={isIndex} />")

fs.writeFileSync(path, content)
