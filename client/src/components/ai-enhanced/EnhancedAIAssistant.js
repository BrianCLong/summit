"use strict";
/**
 * Enhanced AI Assistant - Testable Version
 * Advanced AI interface for IntelGraph with conversation capabilities
 */
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
exports.EnhancedAIAssistant = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const useHoldToTalk_1 = require("./hooks/useHoldToTalk"); // Correct relative path
const realClock = {
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id),
    now: () => Date.now(),
};
const generateResponse = async (userMessage) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const queryKeywords = [
        'find',
        'show',
        'search',
        'query',
        'get',
        'list',
        'analyze',
    ];
    const containsQueryRequest = queryKeywords.some((keyword) => userMessage.toLowerCase().includes(keyword));
    let response = '';
    let confidence = 0.85;
    if (containsQueryRequest) {
        response = `I understand you're looking for data. Let me help you construct an optimized query for that. Based on your request, I'd suggest focusing on these key entities and relationships.

Would you like me to generate a specific Cypher query for this?`;
        confidence = 0.92;
    }
    else if (userMessage.toLowerCase().includes('help')) {
        response = `I'm here to help you navigate and analyze your intelligence data. I can assist with:

🔍 Query Generation: Convert natural language to optimized Cypher queries
📊 Data Analysis: Identify patterns, anomalies, and insights
🗺️ Navigation: Guide you to relevant tools and features

What specific aspect would you like help with?`;
    }
    else {
        response = `I understand your question. Based on the current context and your investigation patterns, here are some insights that might be relevant to your analysis.

Let me provide some targeted recommendations based on your query history.`;
    }
    return {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content: response,
        timestamp: new Date(),
        metadata: {
            confidence,
            sources: ['Knowledge Base', 'Query History', 'Context Analysis'],
        },
    };
};
const EnhancedAIAssistant = ({ onQueryGenerate, onNavigate, enableVoice = true, enableProactiveSuggestions = true, transport, clock = realClock, typingDelayMs = 250, debounceMs = 200, }) => {
    const messagesEndRef = (0, react_1.useRef)(null);
    const inputRef = (0, react_1.useRef)(null);
    const abortRef = (0, react_1.useRef)(null);
    const timers = (0, react_1.useRef)([]);
    const [messages, setMessages] = (0, react_1.useState)([
        {
            id: 'welcome',
            type: 'assistant',
            content: `Hello! I'm IntelBot, your Intelligence Analysis Assistant. I'm here to help you with intelligent data analysis and navigation. How can I assist you today?`,
            timestamp: new Date(),
            metadata: {
                confidence: 1.0,
                sources: ['System'],
            },
        },
    ]);
    const [inputValue, setInputValue] = (0, react_1.useState)('');
    const [isTyping, setIsTyping] = (0, react_1.useState)(false);
    const [voiceEnabled, setVoiceEnabled] = (0, react_1.useState)(enableVoice);
    const [isListening, setIsListening] = (0, react_1.useState)(false);
    const [status, setStatus] = (0, react_1.useState)('idle');
    const [streamBuf, setStreamBuf] = (0, react_1.useState)('');
    // Ref to avoid TDZ/closure issues when callbacks reference handlers defined later
    const handleSendMessageRef = (0, react_1.useRef)(() => { });
    // Voice control logic
    const startVoice = (0, react_1.useCallback)(() => {
        if (!voiceEnabled)
            return;
        setIsListening(true);
        if (window.SpeechRecognition ||
            window.webkitSpeechRecognition) {
            const SpeechRecognition = window.SpeechRecognition ||
                window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.onstart = () => setIsListening(true);
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                handleSendMessageRef.current(transcript);
            };
            recognition.onend = () => setIsListening(false);
            recognition.start();
        }
    }, [voiceEnabled]);
    const stopVoice = (0, react_1.useCallback)(() => {
        setIsListening(false);
        // Abort any ongoing recognition if needed
        if (window.SpeechRecognition ||
            window.webkitSpeechRecognition) {
            const SpeechRecognition = window.SpeechRecognition ||
                window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition(); // Need to get the active instance if possible
            // For simplicity, we'll just stop the current listening state.
            // A more robust solution would involve storing the recognition instance.
            // For now, the mock handles the `onend` call.
        }
    }, []);
    const holdRef = (0, useHoldToTalk_1.useHoldToTalk)(startVoice, stopVoice); // Integrate the hook
    // 🔒 keep a ref to the latest stream buffer so the event handler sees fresh data
    const streamBufRef = (0, react_1.useRef)('');
    // Auto-scroll to bottom
    (0, react_1.useEffect)(() => {
        messagesEndRef.current?.scrollTo({
            top: messagesEndRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }, [messages]);
    // ✅ subscribe exactly once per transport; no dependency on streamBuf
    (0, react_1.useEffect)(() => {
        if (!transport)
            return;
        const unsubscribe = transport.on((evt) => {
            console.log('TRANS-EVT:', evt.type, evt.type === 'token' ? evt.value : '');
            if (abortRef.current?.signal.aborted) {
                console.log('EVENT DROPPED - ABORTED');
                return;
            }
            switch (evt.type) {
                case 'status':
                    setStatus(evt.value);
                    setIsTyping(evt.value === 'thinking' || evt.value === 'streaming');
                    break;
                case 'token':
                    setStatus('streaming');
                    setIsTyping(true);
                    const nextBuf = streamBufRef.current + evt.value;
                    streamBufRef.current = nextBuf;
                    setStreamBuf(nextBuf);
                    break;
                case 'done': {
                    const final = streamBufRef.current;
                    console.log('DONE RECEIVED. BUFFER:', final);
                    if (final) {
                        setMessages((m) => [
                            ...m,
                            {
                                id: `msg-${clock.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                type: 'assistant',
                                content: final,
                                timestamp: new Date(),
                                metadata: {
                                    confidence: 0.85,
                                    sources: ['AI Assistant'],
                                },
                            },
                        ]);
                        setStreamBuf('');
                        streamBufRef.current = '';
                    }
                    setStatus('idle');
                    setIsTyping(false);
                    break;
                }
                case 'error':
                    setStatus('error');
                    setIsTyping(false);
                    break;
            }
        });
        return () => unsubscribe();
    }, [transport, clock]);
    // Cleanup on unmount
    (0, react_1.useEffect)(() => {
        return () => {
            abortRef.current?.abort();
            timers.current.forEach(clock.clearTimeout);
            timers.current = [];
        };
    }, [clock]);
    const pushTimer = (id) => {
        timers.current.push(id);
    };
    const handleSendMessage = (0, react_1.useCallback)(async (text) => {
        const messageText = text || inputValue;
        if (!messageText.trim())
            return;
        const userMessage = {
            id: `msg-${clock.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'user',
            content: messageText,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        if (!text)
            setInputValue(''); // Only clear if using current input
        if (transport) {
            // Use transport for testable async behavior
            const id = clock.setTimeout(() => {
                abortRef.current?.abort();
                abortRef.current = new AbortController();
                setStatus('thinking');
                setIsTyping(true);
                // Typing indicator delay – purely cosmetic, test-controlled
                pushTimer(clock.setTimeout(() => {
                    if (!abortRef.current?.signal.aborted)
                        setStatus('streaming');
                }, typingDelayMs));
                transport.send(messageText, abortRef.current.signal);
            }, debounceMs);
            pushTimer(id);
        }
        else {
            // Fallback to original behavior for legacy usage
            setIsTyping(true);
            try {
                const assistantResponse = await generateResponse(messageText);
                setMessages((prev) => [...prev, assistantResponse]);
            }
            catch (error) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `error-${clock.now()}`,
                        type: 'assistant',
                        content: 'I apologize, but I encountered an error processing your request. Please try again.',
                        timestamp: new Date(),
                        metadata: {
                            confidence: 0,
                            sources: ['Error Handler'],
                        },
                    },
                ]);
            }
            finally {
                setIsTyping(false);
            }
        }
    }, [inputValue, transport, clock, typingDelayMs, debounceMs]);
    // Keep ref in sync for callbacks defined earlier
    (0, react_1.useEffect)(() => {
        handleSendMessageRef.current = handleSendMessage;
    }, [handleSendMessage]);
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };
    const handleCopy = (content) => {
        navigator.clipboard.writeText(content);
    };
    const MessageBubble = ({ message }) => {
        const isUser = message.type === 'user';
        const isSystem = message.type === 'system';
        return (<material_1.Box sx={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                gap: 1,
                mb: 2,
                alignItems: 'flex-start',
            }}>
        <material_1.Avatar sx={{
                width: 32,
                height: 32,
                bgcolor: isUser ? 'primary.main' : 'secondary.main',
            }}>
          {isUser ? <icons_material_1.Person fontSize="small"/> : <icons_material_1.SmartToy fontSize="small"/>}
        </material_1.Avatar>

        <material_1.Paper elevation={1} sx={{
                p: 2,
                maxWidth: '70%',
                bgcolor: isUser ? 'primary.main' : 'background.paper',
                color: isUser ? 'primary.contrastText' : 'text.primary',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            }}>
          <material_1.Typography variant="body1" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
            {message.content}
          </material_1.Typography>

          {message.metadata && (<material_1.Box sx={{ mt: 1 }}>
              {message.metadata.confidence && (<material_1.Chip label={`${(message.metadata.confidence * 100).toFixed(0)}% confident`} size="small" variant="outlined" sx={{ mr: 1, mb: 1 }}/>)}
            </material_1.Box>)}

          {message.type === 'assistant' && (<material_1.Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Follow-up Actions */}
              <material_1.Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <material_1.Button size="small" variant="outlined" onClick={() => alert('Generate query clicked!')}>
                  Generate Query
                </material_1.Button>
                <material_1.Button size="small" variant="outlined" onClick={() => alert('Export analysis clicked!')}>
                  Export Analysis
                </material_1.Button>
              </material_1.Stack>

              {/* Feedback (Thumbs/Labels) */}
              <material_1.Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mt: 1,
                }}>
                <material_1.Typography variant="caption" color="text.secondary">
                  {message.timestamp.toLocaleTimeString()}
                </material_1.Typography>

                <material_1.Stack direction="row" spacing={1}>
                  <material_1.IconButton size="small" onClick={() => handleCopy(message.content)}>
                    <icons_material_1.ContentCopy fontSize="small"/>
                  </material_1.IconButton>

                  {!isUser && (<>
                      <material_1.IconButton size="small" color="success" onClick={() => alert('Feedback: Thumbs Up!')}>
                        <icons_material_1.ThumbUp fontSize="small"/>
                      </material_1.IconButton>
                      <material_1.IconButton size="small" onClick={() => alert('Feedback: Thumbs Down!')}>
                        <icons_material_1.ThumbDown fontSize="small"/>
                      </material_1.IconButton>
                    </>)}
                </material_1.Stack>
              </material_1.Box>
            </material_1.Box>)}
        </material_1.Paper>
      </material_1.Box>);
    };
    return (<material_1.Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <material_1.Paper elevation={1} sx={{ p: 2, borderRadius: '12px 12px 0 0' }}>
        <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
          <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <material_1.Avatar sx={{ bgcolor: 'secondary.main' }}>
              <icons_material_1.SmartToy />
            </material_1.Avatar>

            <material_1.Box>
              <material_1.Typography variant="h6" sx={{ fontWeight: 600 }}>
                IntelBot
              </material_1.Typography>
              <material_1.Typography variant="caption" color="text.secondary" role="status" aria-label="assistant-status">
                Intelligence Analysis Assistant •{' '}
                {status === 'thinking'
            ? 'Thinking...'
            : status === 'streaming'
                ? 'Typing...'
                : status === 'error'
                    ? 'Error'
                    : 'Online'}
              </material_1.Typography>
            </material_1.Box>
          </material_1.Box>

          <material_1.Stack direction="row" spacing={1}>
            <material_1.IconButton ref={holdRef} // Attach the ref here
     color={isListening ? 'primary' : 'default'} 
    // onClick is now handled by the useHoldToTalk hook's onStart/onEnd
    // We'll keep a simplified onClick for direct toggling if needed, or remove if only hold-to-talk
    onClick={() => {
            if (isListening) {
                // If currently listening, a click should stop it
                stopVoice();
            }
            else {
                // If not listening, a click should start it (for tap-to-talk behavior)
                startVoice();
            }
        }} disabled={!voiceEnabled} aria-label={isListening ? 'Stop Voice' : 'Start Voice'}>
              {isListening ? <icons_material_1.Mic /> : <icons_material_1.MicOff />}
            </material_1.IconButton>

            <material_1.IconButton aria-label="Settings">
              <icons_material_1.Settings />
            </material_1.IconButton>
          </material_1.Stack>
        </material_1.Box>
      </material_1.Paper>

      {/* Messages Area */}
      <material_1.Box sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            bgcolor: 'background.default',
        }} role="log" aria-live="polite" data-testid="message-log">
        {messages.map((message) => (<div key={message.id} role="article" aria-label={message.type}>
            <MessageBubble message={message}/>
          </div>))}

        {streamBuf && (<div role="article" aria-label="assistant">
            <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <material_1.Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                <icons_material_1.SmartToy fontSize="small"/>
              </material_1.Avatar>
              <material_1.Paper elevation={1} sx={{ p: 2, borderRadius: '16px 16px 16px 4px' }}>
                <material_1.Typography variant="body2">{streamBuf}</material_1.Typography>
              </material_1.Paper>
            </material_1.Box>
          </div>)}

        {isTyping && (<material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <material_1.Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              <icons_material_1.SmartToy fontSize="small"/>
            </material_1.Avatar>
            <material_1.Paper elevation={1} sx={{ p: 2, borderRadius: '16px 16px 16px 4px' }}>
              <material_1.Typography variant="body2">Typing...</material_1.Typography>
            </material_1.Paper>
          </material_1.Box>)}

        <div ref={messagesEndRef}/>
      </material_1.Box>

      {/* Input Area */}
      <material_1.Paper elevation={1} sx={{ p: 2, borderRadius: '0 0 12px 12px' }}>
        <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <material_1.TextField ref={inputRef} fullWidth variant="outlined" placeholder="Ask me anything about your data..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={handleKeyPress} disabled={isTyping} inputProps={{
            'aria-label': 'assistant-input',
        }} sx={{
            '& .MuiOutlinedInput-root': {
                borderRadius: 3,
            },
        }}/>

          <material_1.IconButton color="primary" onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isTyping} sx={{ p: 1.5 }} aria-label="send">
            <icons_material_1.Send />
          </material_1.IconButton>
        </material_1.Box>
      </material_1.Paper>
    </material_1.Box>);
};
exports.EnhancedAIAssistant = EnhancedAIAssistant;
exports.default = exports.EnhancedAIAssistant;
