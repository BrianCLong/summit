import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../ToastContainer';
import LoadingSpinner from '../LoadingSpinner';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    confidence?: number;
    sources?: string[];
    reasoning?: string;
    actions?: Array<{
      type: 'search' | 'analyze' | 'export' | 'investigate';
      params: any;
      executed?: boolean;
    }>;
  };
}

interface AIAssistantProps {
  context?: {
    currentInvestigation?: string;
    selectedEntities?: string[];
    recentSearches?: string[];
  };
  onActionRequest?: (action: any) => void;
  className?: string;
}

const EnhancedAIAssistant: React.FC<AIAssistantProps> = ({
  context,
  onActionRequest,
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<'idle' | 'thinking' | 'streaming' | 'error'>('idle');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const toast = useToast();

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your AI-powered intelligence analyst assistant. I can help you with:

• **Analysis**: Examine entities, relationships, and patterns
• **Search**: Find relevant intelligence data using natural language
• **Investigation**: Guide you through investigation workflows
• **Insights**: Provide context and recommendations
• **Export**: Generate reports and summaries

What would you like to explore today?`,
      timestamp: Date.now(),
      metadata: {
        confidence: 1.0
      }
    };

    setMessages([welcomeMessage]);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
        toast.error('Voice Error', 'Speech recognition failed');
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, [toast]);

  // Simulate AI response with streaming
  const simulateAIResponse = useCallback(async (userMessage: string): Promise<string> => {
    setStatus('thinking');
    
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setStatus('streaming');
    
    // Generate contextual response based on user input
    let response = '';
    
    if (userMessage.toLowerCase().includes('search') || userMessage.toLowerCase().includes('find')) {
      response = `I'll help you search for relevant intelligence data. Based on your query "${userMessage}", I recommend:

**Search Strategy:**
• Use entity extraction to identify key terms
• Apply confidence thresholds >80% for high-value results
• Cross-reference with current investigation context

**Suggested Filters:**
• Entity types: Person, Organization, IP Address
• Date range: Last 30 days
• Confidence: High (>85%)

Would you like me to execute this search or refine the parameters?`;
    } else if (userMessage.toLowerCase().includes('analy')) {
      response = `I'll analyze the available data for patterns and insights:

**Analysis Approach:**
• Graph centrality analysis to identify key entities
• Temporal pattern detection for activity trends
• Relationship strength assessment
• Anomaly detection using ML models

**Current Context:**
${context?.currentInvestigation ? `• Investigation: ${context.currentInvestigation}` : ''}
${context?.selectedEntities?.length ? `• Selected entities: ${context.selectedEntities.length}` : ''}

**Recommended Actions:**
1. Generate entity relationship map
2. Identify cluster formations
3. Highlight unusual patterns
4. Export findings to investigation notes

Shall I proceed with this analysis?`;
    } else if (userMessage.toLowerCase().includes('report') || userMessage.toLowerCase().includes('export')) {
      response = `I can generate comprehensive reports tailored to your needs:

**Available Report Templates:**
• **Executive Summary** - High-level findings and recommendations
• **Technical Report** - Detailed technical analysis with IOCs
• **Forensic Report** - Chain of custody and legal compliance
• **Custom Report** - Tailored to your specific requirements

**Export Formats:**
• PDF with executive formatting
• Excel with data tables and charts
• JSON for API integration
• Cypher for graph database queries

What type of report would be most useful for your current investigation?`;
    } else if (userMessage.toLowerCase().includes('help') || userMessage.toLowerCase().includes('what can you do')) {
      response = `I'm equipped with advanced intelligence analysis capabilities:

**Core Functions:**
🔍 **Smart Search** - Natural language query processing
📊 **Data Analysis** - Pattern recognition and anomaly detection  
🕸️ **Graph Analysis** - Relationship mapping and centrality analysis
📋 **Report Generation** - Multi-format professional reports
🎯 **Investigation Guidance** - Workflow recommendations
🔗 **Entity Resolution** - Duplicate detection and consolidation

**Advanced Features:**
• Real-time collaboration support
• Multi-modal data processing (text, images, documents)
• ML-powered entity extraction
• Temporal analysis and trend detection
• Risk scoring and threat assessment

**Integration Capabilities:**
• OSINT source integration
• Threat intelligence feeds
• Custom data connectors
• API-driven automation

Try asking me to "analyze the current investigation" or "search for suspicious activities"!`;
    } else {
      // Generic helpful response
      response = `I understand you're asking about "${userMessage}". Let me provide some guidance:

**Based on your query, I can help with:**
• Searching relevant data sources
• Analyzing entity relationships
• Identifying patterns and anomalies
• Generating actionable insights

**Context-Aware Suggestions:**
${context?.currentInvestigation ? `• Focus analysis on ${context.currentInvestigation}` : '• Start a new investigation to organize findings'}
${context?.selectedEntities?.length ? `• Expand analysis from ${context.selectedEntities.length} selected entities` : '• Select entities to begin relationship mapping'}

**Next Steps:**
1. **Be more specific** - "Analyze IP addresses for geographic clustering"
2. **Request actions** - "Generate a timeline of recent activities"  
3. **Ask for insights** - "What patterns suggest coordinated activity?"

How can I assist you further with your intelligence analysis?`;
    }
    
    // Simulate streaming response
    const chunks = response.split(' ');
    let streamedResponse = '';
    
    for (let i = 0; i < chunks.length; i++) {
      streamedResponse += chunks[i] + ' ';
      await new Promise(resolve => setTimeout(resolve, 50)); // Streaming delay
    }
    
    setStatus('idle');
    return response;
  }, [context, toast]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const aiResponse = await simulateAIResponse(input.trim());
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
        metadata: {
          confidence: 0.92,
          sources: ['IntelGraph Knowledge Base', 'Analysis Engine'],
          reasoning: 'Generated based on user query and contextual intelligence data'
        }
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Check if response suggests actions
      if (aiResponse.includes('execute') || aiResponse.includes('proceed')) {
        toast.info('AI Suggestion', 'Ready to execute suggested actions');
      }
      
    } catch (error) {
      console.error('AI Assistant error:', error);
      setStatus('error');
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: 'I apologize, but I encountered an error processing your request. Please try rephrasing your question or contact support if the issue persists.',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('AI Assistant Error', 'Failed to generate response');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, simulateAIResponse, toast]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const clearChat = () => {
    setMessages(messages.slice(0, 1)); // Keep welcome message
    toast.info('Chat Cleared', 'Conversation history has been reset');
  };

  const exportChat = () => {
    const chatData = {
      timestamp: new Date().toISOString(),
      context,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp).toISOString(),
        metadata: msg.metadata
      }))
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Chat Exported', 'Conversation saved to downloads');
  };

  return (
    <div className={`ai-assistant flex flex-col h-full bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Intelligence Assistant</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${
                status === 'idle' ? 'bg-green-400' :
                status === 'thinking' ? 'bg-yellow-400 animate-pulse' :
                status === 'streaming' ? 'bg-blue-400 animate-pulse' :
                'bg-red-400'
              }`} />
              <span className="capitalize">{status}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-gray-600 rounded"
            title="Clear chat"
          >
            🗑️
          </button>
          <button
            onClick={exportChat}
            className="p-2 text-gray-400 hover:text-gray-600 rounded"
            title="Export chat"
          >
            💾
          </button>
        </div>
      </div>

      {/* Context Bar */}
      {context && (
        <div className="px-4 py-2 bg-gray-50 border-b text-xs">
          <div className="flex gap-4 text-gray-600">
            {context.currentInvestigation && (
              <span>📋 Investigation: {context.currentInvestigation}</span>
            )}
            {context.selectedEntities?.length && (
              <span>🎯 Selected: {context.selectedEntities.length} entities</span>
            )}
            {context.recentSearches?.length && (
              <span>🔍 Recent searches: {context.recentSearches.length}</span>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-lg p-3 ${
              message.role === 'user' 
                ? 'bg-blue-600 text-white'
                : message.role === 'system'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-gray-100 text-gray-900'
            }`}>
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {message.metadata && (
                <div className="mt-2 pt-2 border-t border-gray-200 text-xs opacity-75">
                  {message.metadata.confidence && (
                    <div>Confidence: {(message.metadata.confidence * 100).toFixed(0)}%</div>
                  )}
                  {message.metadata.sources && (
                    <div>Sources: {message.metadata.sources.join(', ')}</div>
                  )}
                </div>
              )}
              
              <div className="text-xs opacity-60 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <LoadingSpinner size="sm" message="" />
              <span className="text-sm text-gray-600 ml-2">Analyzing...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about intelligence analysis, search queries, or data insights..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
              disabled={isLoading}
            />
            
            {recognitionRef.current && (
              <button
                onClick={startListening}
                disabled={isListening || isLoading}
                className={`absolute right-2 top-2 p-1 rounded ${
                  isListening 
                    ? 'text-red-500 animate-pulse' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Voice input"
              >
                🎤
              </button>
            )}
          </div>
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <LoadingSpinner size="sm" message="" /> : '📤'}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send • Shift+Enter for new line • Use voice input 🎤
        </div>
      </div>
    </div>
  );
};

export default EnhancedAIAssistant;