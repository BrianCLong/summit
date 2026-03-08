"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAssistant = AIAssistant;
const react_1 = __importStar(require("react"));
const outline_1 = require("@heroicons/react/24/outline");
function AIAssistant({ context }) {
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [inputValue, setInputValue] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const messagesEndRef = (0, react_1.useRef)(null);
    const inputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        scrollToBottom();
    }, [messages]);
    (0, react_1.useEffect)(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);
    // Initialize with context-aware greeting
    (0, react_1.useEffect)(() => {
        if (context && messages.length === 0) {
            const greeting = generateContextualGreeting(context);
            setMessages([
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: greeting,
                    timestamp: new Date(),
                },
            ]);
        }
    }, [context]);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    const generateContextualGreeting = (ctx) => {
        if (ctx?.recentErrors?.length) {
            return `👋 I noticed some recent errors in your Maestro runs. I can help troubleshoot issues, explain error messages, or suggest optimizations. What would you like to know?`;
        }
        if (ctx?.runId) {
            return `👋 I'm here to help with your Maestro run ${ctx.runId.slice(0, 8)}... I can explain what's happening, help with approvals, or suggest improvements. How can I assist?`;
        }
        return `👋 I'm your Maestro AI Assistant! I can help with:\n\n• Troubleshooting runs and errors\n• Explaining router decisions\n• Optimizing pipeline performance\n• Managing approvals and policies\n• Best practices and recommendations\n\nWhat would you like to know?`;
    };
    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) {
            return;
        }
        const userMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        try {
            const response = await fetch('/api/maestro/v1/ai-assistant/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    context: {
                        ...context,
                        conversationHistory: messages.slice(-5), // Last 5 messages for context
                    },
                }),
            });
            const data = await response.json();
            const assistantMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: data.content,
                timestamp: new Date(),
                metadata: data.metadata,
            };
            setMessages(prev => [...prev, assistantMessage]);
        }
        catch (error) {
            console.error('Failed to send message to AI assistant:', error);
            const errorMessage = {
                id: crypto.randomUUID(),
                role: 'system',
                content: 'Sorry, I encountered an error. Please try again or check the system status.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    const executeAction = async (action, params) => {
        try {
            const response = await fetch(`/api/maestro/v1/ai-assistant/actions/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ params, context }),
            });
            if (response.ok) {
                const result = await response.json();
                const actionMessage = {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: `✅ Action completed: ${result.message || `Executed ${action}`}`,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, actionMessage]);
            }
        }
        catch (error) {
            console.error('Failed to execute action:', error);
        }
    };
    const copyToClipboard = (content) => {
        navigator.clipboard.writeText(content);
        // Could show a toast notification here
    };
    const quickPrompts = [
        "What's the status of my current run?",
        'Why did my router choose this model?',
        'How can I improve performance?',
        'Explain this error message',
        'Show me cost optimization tips',
    ];
    if (!isOpen) {
        return (<button onClick={() => setIsOpen(true)} className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105 z-50" title="Open AI Assistant">
        <outline_1.ChatBubbleLeftRightIcon className="h-6 w-6"/>
        {context?.recentErrors?.length ? (<div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {context.recentErrors.length}
          </div>) : null}
      </button>);
    }
    return (<div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <outline_1.SparklesIcon className="h-5 w-5 text-blue-600"/>
          <h3 className="font-semibold text-gray-900">Maestro AI Assistant</h3>
        </div>
        <button aria-label="Close AI Assistant" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
          <outline_1.XMarkIcon className="h-5 w-5"/>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (<div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                ? 'bg-blue-600 text-white'
                : message.role === 'system'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-gray-100 text-gray-900'}`}>
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>

              {/* Message metadata */}
              {message.metadata && (<div className="mt-2 space-y-2">
                  {/* Confidence */}
                  {message.metadata.confidence !== undefined && (<div className="flex items-center space-x-2">
                      <span className="text-xs opacity-75">Confidence:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-1">
                        <div className="bg-green-500 h-1 rounded-full" style={{ width: `${message.metadata.confidence}%` }}></div>
                      </div>
                      <span className="text-xs opacity-75">
                        {message.metadata.confidence}%
                      </span>
                    </div>)}

                  {/* Suggestions */}
                  {message.metadata.suggestions &&
                    message.metadata.suggestions.length > 0 && (<div className="space-y-1">
                        <div className="text-xs opacity-75">Suggestions:</div>
                        {message.metadata.suggestions.map((suggestion, idx) => (<div key={idx} className="text-xs bg-blue-50 text-blue-800 p-2 rounded">
                            💡 {suggestion}
                          </div>))}
                      </div>)}

                  {/* Actions */}
                  {message.metadata.actions &&
                    message.metadata.actions.length > 0 && (<div className="space-y-1">
                        <div className="text-xs opacity-75">Actions:</div>
                        <div className="space-y-1">
                          {message.metadata.actions.map((action, idx) => (<button key={idx} onClick={() => executeAction(action.action, action.params)} className="block w-full text-left text-xs bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors">
                              🔧 {action.label}
                            </button>))}
                        </div>
                      </div>)}
                </div>)}

              {/* Copy button */}
              <button aria-label="Copy message" onClick={() => copyToClipboard(message.content)} className="mt-2 text-xs opacity-50 hover:opacity-100 flex items-center space-x-1">
                <outline_1.ClipboardDocumentIcon className="h-3 w-3"/>
                <span>Copy</span>
              </button>
            </div>
          </div>))}

        {/* Loading indicator */}
        {isLoading && (<div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>)}

        <div ref={messagesEndRef}/>
      </div>

      {/* Quick prompts (shown when no messages) */}
      {messages.length <= 1 && (<div className="p-4 border-t border-gray-200 space-y-2">
          <div className="text-xs text-gray-600 mb-2">Quick questions:</div>
          {quickPrompts.slice(0, 3).map((prompt, idx) => (<button key={idx} onClick={() => {
                    setInputValue(prompt);
                    inputRef.current?.focus();
                }} className="block w-full text-left text-xs p-2 bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors">
              {prompt}
            </button>))}
        </div>)}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex space-x-2">
          <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask me about Maestro..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={isLoading}/>
          <button aria-label="Send message" onClick={sendMessage} disabled={!inputValue.trim() || isLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg p-2 transition-colors">
            <outline_1.PaperAirplaneIcon className="h-4 w-4"/>
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>);
}
exports.default = AIAssistant;
