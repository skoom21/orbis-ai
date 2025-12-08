const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

// Load existing conversation ID or generate new one
let conversationId = localStorage.getItem('orbis_conversation_id') || generateUUID();
localStorage.setItem('orbis_conversation_id', conversationId);

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
    messageDiv.textContent = content;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message typing';
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    typingDiv.id = 'typing-indicator';
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Add user message
    addMessage(message, true);
    messageInput.value = '';
    sendButton.disabled = true;
    
    // Add typing indicator
    addTypingIndicator();
    
    try {
        // Use the new streaming endpoint
        const response = await fetch('/api/v1/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                conversation_id: conversationId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Handle SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let messageDiv = null;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                            fullResponse += data.content;
                            if (!messageDiv) {
                                messageDiv = document.createElement('div');
                                messageDiv.className = 'message assistant-message';
                                messagesContainer.appendChild(messageDiv);
                            }
                            messageDiv.textContent = fullResponse;
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    } catch (e) {
                        // Ignore parse errors for incomplete chunks
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator();
        
        let errorMessage = "Sorry, I'm having trouble connecting. Please try again.";
        
        if (error.message.includes('500')) {
            errorMessage = "I'm experiencing technical difficulties. Please try a different question.";
        } else if (error.message.includes('network')) {
            errorMessage = "Network connection issue. Please check your internet connection.";
        }
        
        addMessage(errorMessage);
        
        // Show retry button for failed messages
        addRetryButton(message);
        
    } finally {
        sendButton.disabled = false;
        messageInput.focus();
    }
}

function quickMessage(message) {
    messageInput.value = message;
    sendMessage();
}

function addRetryButton(originalMessage) {
    const retryDiv = document.createElement('div');
    retryDiv.className = 'message retry-message';
    retryDiv.innerHTML = `
        <button onclick="retryMessage('${originalMessage}')" class="retry-btn">
            🔄 Retry message
        </button>
    `;
    messagesContainer.appendChild(retryDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function retryMessage(message) {
    // Remove retry button
    const retryButtons = document.querySelectorAll('.retry-message');
    retryButtons.forEach(btn => btn.remove());
    
    // Retry the message
    messageInput.value = message;
    sendMessage();
}

function newConversation() {
    conversationId = generateUUID();
    localStorage.setItem('orbis_conversation_id', conversationId);
    messagesContainer.innerHTML = '';
    addMessage("Hello! I'm your Orbis AI travel assistant. Where would you like to go?");
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Initialize chat
document.addEventListener('DOMContentLoaded', async function() {
    // Try to load existing conversation history
    try {
        await loadConversationHistory();
    } catch (error) {
        console.log('No previous conversation found, starting fresh');
        addMessage("Hello! I'm your Orbis AI travel assistant. Where would you like to go?");
    }
    
    messageInput.focus();
    
    // Add event listeners
    messageInput.addEventListener('keypress', handleKeyPress);
});

async function loadConversationHistory() {
    try {
        const response = await fetch(`/api/v1/conversations/${conversationId}/messages`);
        if (response.ok) {
            const messages = await response.json();
            if (messages && messages.length > 0) {
                messages.forEach(msg => {
                    addMessage(msg.content, msg.role === 'user');
                });
                return;
            }
        }
    } catch (error) {
        console.log('Could not load conversation history:', error);
    }
    
    // Fallback to welcome message
    addMessage("Hello! I'm your Orbis AI travel assistant. Where would you like to go?");
}