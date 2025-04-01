// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const actionButtons = document.querySelectorAll('.action-button');
const historyButton = document.getElementById('historyButton');
const historyModal = document.getElementById('historyModal');
const closeHistory = document.getElementById('closeHistory');
const clearHistory = document.getElementById('clearHistory');
const chatHistory = document.getElementById('chatHistory');

// Event Listeners
sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleUserInput();
    }
});

actionButtons.forEach(button => {
    button.addEventListener('click', () => {
        const query = button.getAttribute('data-query');
        userInput.value = query;
        handleUserInput();
    });
});

historyButton.addEventListener('click', showHistory);
closeHistory.addEventListener('click', hideHistory);
clearHistory.addEventListener('click', clearChatHistory);
window.addEventListener('click', (e) => {
    if (e.target === historyModal) {
        hideHistory();
    }
});

// Handle user input
async function handleUserInput() {
    const message = userInput.value.trim();
    if (message) {
        // Add user message to chat
        addMessage('user', message);
        userInput.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            // Send message to API with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Remove typing indicator
            removeTypingIndicator();
            
            if (data.success) {
                // Add assistant's response to chat
                addMessage('assistant', data.response);
            } else {
                throw new Error(data.error || 'Failed to get response');
            }
        } catch (error) {
            removeTypingIndicator();
            let errorMessage = 'Sorry, I encountered an error. ';
            
            if (error.name === 'AbortError') {
                errorMessage += 'The request timed out. Please check if the server is running.';
            } else if (!navigator.onLine) {
                errorMessage += 'Please check your internet connection.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Could not connect to the server. Please make sure the Flask server is running on port 5000.';
            } else {
                errorMessage += error.message;
            }
            
            addMessage('assistant', errorMessage);
            console.error('Error:', error);
        }
    }
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing';
    typingDiv.innerHTML = `
        <div class="avatar"><i class="fas fa-robot"></i></div>
        <div class="content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = chatMessages.querySelector('.typing');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Add message to chat
let currentChatMessages = [];

function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.innerHTML = type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.innerHTML = content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Save message to current chat
    currentChatMessages.push({ type, content });
    
    // Save to history if it's a response from assistant
    if (type === 'assistant') {
        saveChatToHistory(currentChatMessages);
    }
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Chat History Management
function showHistory() {
    historyModal.style.display = 'block';
    loadChatHistory();
}

function hideHistory() {
    historyModal.style.display = 'none';
}

function saveChatToHistory(messages) {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const chatSession = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        messages: messages
    };
    history.unshift(chatSession);
    localStorage.setItem('chatHistory', JSON.stringify(history));
}

function loadChatHistory() {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    chatHistory.innerHTML = '';

    if (history.length === 0) {
        chatHistory.innerHTML = '<p class="no-history">No chat history available</p>';
        return;
    }

    history.forEach(session => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="timestamp">${session.timestamp}</div>
            <div class="preview">${getPreview(session.messages)}</div>
        `;
        historyItem.addEventListener('click', () => loadChatSession(session));
        chatHistory.appendChild(historyItem);
    });
}

function getPreview(messages) {
    const preview = messages.slice(0, 2).map(msg => 
        `<div><strong>${msg.type === 'user' ? 'You' : 'Assistant'}:</strong> ${stripHtml(msg.content)}</div>`
    ).join('');
    return preview;
}

function stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

function loadChatSession(session) {
    chatMessages.innerHTML = '';
    currentChatMessages = [];
    session.messages.forEach(msg => {
        addMessage(msg.type, msg.content);
    });
    hideHistory();
}

function clearChatHistory() {
    if (confirm('Are you sure you want to clear all chat history?')) {
        localStorage.removeItem('chatHistory');
        loadChatHistory();
    }
}