/**
 * Enhanced AI Assistant - Testable Version
 * Advanced AI interface for IntelGraph with conversation capabilities
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Stack,
  Alert,
  Button,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  ContentCopy,
  ThumbUp,
  ThumbDown,
  Settings,
  Mic,
  MicOff,
} from '@mui/icons-material';
import { useHoldToTalk } from './hooks/useHoldToTalk'; // Correct relative path

// Types
interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    sources?: string[];
  };
}

export type AssistantEvent =
  | { type: 'status'; value: 'idle' | 'thinking' | 'streaming' | 'error' }
  | { type: 'token'; value: string }
  | { type: 'done' }
  | { type: 'error'; error: Error };

export interface AssistantTransport {
  send: (input: string, signal: AbortSignal) => void;
  on: (fn: (evt: AssistantEvent) => void) => () => void; // returns unsubscribe
}

export interface Clock {
  setTimeout: (fn: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
  now: () => number;
}

const realClock: Clock = {
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id),
  now: () => Date.now(),
};

interface EnhancedAIAssistantProps {
  onQueryGenerate?: (query: string) => void;
  onNavigate?: (path: string) => void;
  enableVoice?: boolean;
  enableProactiveSuggestions?: boolean;
  transport?: AssistantTransport;
  clock?: Clock;
  typingDelayMs?: number; // indicator delay
  debounceMs?: number; // input debounce
}

const generateResponse = async (userMessage: string): Promise<Message> => {
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
  const containsQueryRequest = queryKeywords.some((keyword) =>
    userMessage.toLowerCase().includes(keyword),
  );

  let response = '';
  let confidence = 0.85;

  if (containsQueryRequest) {
    response = `I understand you're looking for data. Let me help you construct an optimized query for that. Based on your request, I'd suggest focusing on these key entities and relationships.

Would you like me to generate a specific Cypher query for this?`;
    confidence = 0.92;
  } else if (userMessage.toLowerCase().includes('help')) {
    response = `I'm here to help you navigate and analyze your intelligence data. I can assist with:

🔍 Query Generation: Convert natural language to optimized Cypher queries
📊 Data Analysis: Identify patterns, anomalies, and insights
🗺️ Navigation: Guide you to relevant tools and features

What specific aspect would you like help with?`;
  } else {
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

export const EnhancedAIAssistant: React.FC<EnhancedAIAssistantProps> = ({
  onQueryGenerate,
  onNavigate,
  enableVoice = true,
  enableProactiveSuggestions = true,
  transport,
  clock = realClock,
  typingDelayMs = 250,
  debounceMs = 200,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timers = useRef<number[]>([]);

  const [messages, setMessages] = useState<Message[]>([
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

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(enableVoice);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'thinking' | 'streaming' | 'error'
  >('idle');
  const [streamBuf, setStreamBuf] = useState('');
  // Ref to avoid TDZ/closure issues when callbacks reference handlers defined later
  const handleSendMessageRef = useRef<(text?: string) => void>(() => {});

  // Voice control logic
  const startVoice = useCallback(() => {
    if (!voiceEnabled) return;
    setIsListening(true);
    if (
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    ) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessageRef.current(transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    }
  }, [voiceEnabled]);

  const stopVoice = useCallback(() => {
    setIsListening(false);
    // Abort any ongoing recognition if needed
    if (
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    ) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition(); // Need to get the active instance if possible
      // For simplicity, we'll just stop the current listening state.
      // A more robust solution would involve storing the recognition instance.
      // For now, the mock handles the `onend` call.
    }
  }, []);

  const holdRef = useHoldToTalk(startVoice, stopVoice); // Integrate the hook

  // 🔒 keep a ref to the latest stream buffer so the event handler sees fresh data
  const streamRef = useRef('');
  useEffect(() => {
    streamRef.current = streamBuf;
  }, [streamBuf]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollTo({
      top: messagesEndRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // ✅ subscribe exactly once per transport; no dependency on streamBuf
  useEffect(() => {
    if (!transport) return;
    const unsubscribe = transport.on((evt) => {
      if (abortRef.current?.signal.aborted) return;

      switch (evt.type) {
        case 'status':
          setStatus(evt.value);
          setIsTyping(evt.value === 'thinking' || evt.value === 'streaming');
          break;
        case 'token':
          setStatus('streaming');
          setIsTyping(true);
          setStreamBuf((s) => s + evt.value);
          break;
        case 'done': {
          const final = streamRef.current;
          if (final) {
            setMessages((m) => [
              ...m,
              {
                id: `msg-${clock.now()}`,
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
            streamRef.current = '';
          }
          // 👇 microtask settle ensures DOM reflects final message before "idle"
          Promise.resolve().then(() => setStatus('idle'));
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
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      timers.current.forEach(clock.clearTimeout);
      timers.current = [];
    };
  }, [clock]);

  const pushTimer = (id: number) => {
    timers.current.push(id);
  };

  const handleSendMessage = useCallback(
    async (text?: string) => {
      const messageText = text || inputValue;
      if (!messageText.trim()) return;

      const userMessage: Message = {
        id: `msg-${clock.now()}`,
        type: 'user',
        content: messageText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      if (!text) setInputValue(''); // Only clear if using current input

      if (transport) {
        // Use transport for testable async behavior
        const id = clock.setTimeout(() => {
          abortRef.current?.abort();
          abortRef.current = new AbortController();
          setStatus('thinking');
          setIsTyping(true);

          // Typing indicator delay – purely cosmetic, test-controlled
          pushTimer(
            clock.setTimeout(() => {
              if (!abortRef.current?.signal.aborted) setStatus('streaming');
            }, typingDelayMs),
          );

          transport.send(messageText, abortRef.current.signal);
        }, debounceMs);
        pushTimer(id);
      } else {
        // Fallback to original behavior for legacy usage
        setIsTyping(true);
        try {
          const assistantResponse = await generateResponse(messageText);
          setMessages((prev) => [...prev, assistantResponse]);
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${clock.now()}`,
              type: 'assistant',
              content:
                'I apologize, but I encountered an error processing your request. Please try again.',
              timestamp: new Date(),
              metadata: {
                confidence: 0,
                sources: ['Error Handler'],
              },
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      }
    },
    [inputValue, transport, clock, typingDelayMs, debounceMs],
  );

  // Keep ref in sync for callbacks defined earlier
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          gap: 1,
          mb: 2,
          alignItems: 'flex-start',
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: isUser ? 'primary.main' : 'secondary.main',
          }}
        >
          {isUser ? <Person fontSize="small" /> : <SmartToy fontSize="small" />}
        </Avatar>

        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: '70%',
            bgcolor: isUser ? 'primary.main' : 'background.paper',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          }}
        >
          <Typography variant="body1" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>

          {message.metadata && (
            <Box sx={{ mt: 1 }}>
              {message.metadata.confidence && (
                <Chip
                  label={`${(message.metadata.confidence * 100).toFixed(0)}% confident`}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1, mb: 1 }}
                />
              )}
            </Box>
          )}

          {message.type === 'assistant' && (
            <Box
              sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}
            >
              {/* Follow-up Actions */}
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => alert('Generate query clicked!')}
                >
                  Generate Query
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => alert('Export analysis clicked!')}
                >
                  Export Analysis
                </Button>
              </Stack>

              {/* Feedback (Thumbs/Labels) */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mt: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {message.timestamp.toLocaleTimeString()}
                </Typography>

                <Stack direction="row" spacing={1}>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(message.content)}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>

                  {!isUser && (
                    <>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => alert('Feedback: Thumbs Up!')}
                      >
                        <ThumbUp fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => alert('Feedback: Thumbs Down!')}
                      >
                        <ThumbDown fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Stack>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: '12px 12px 0 0' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>
              <SmartToy />
            </Avatar>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                IntelBot
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                role="status"
                aria-label="assistant-status"
              >
                Intelligence Analysis Assistant •{' '}
                {status === 'thinking'
                  ? 'Thinking...'
                  : status === 'streaming'
                    ? 'Typing...'
                    : status === 'error'
                      ? 'Error'
                      : 'Online'}
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1}>
            <IconButton
              ref={holdRef} // Attach the ref here
              color={isListening ? 'primary' : 'default'}
              // onClick is now handled by the useHoldToTalk hook's onStart/onEnd
              // We'll keep a simplified onClick for direct toggling if needed, or remove if only hold-to-talk
              onClick={() => {
                if (isListening) {
                  // If currently listening, a click should stop it
                  stopVoice();
                } else {
                  // If not listening, a click should start it (for tap-to-talk behavior)
                  startVoice();
                }
              }}
              disabled={!voiceEnabled}
              aria-label={isListening ? 'Stop Voice' : 'Start Voice'}
            >
              {isListening ? <Mic /> : <MicOff />}
            </IconButton>

            <IconButton aria-label="Settings">
              <Settings />
            </IconButton>
          </Stack>
        </Box>
      </Paper>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          bgcolor: 'background.default',
        }}
        role="log"
        aria-live="polite"
        data-testid="message-log"
      >
        {messages.map((message) => (
          <div key={message.id} role="article" aria-label={message.type}>
            <MessageBubble message={message} />
          </div>
        ))}

        {streamBuf && (
          <div role="article" aria-label="assistant">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                <SmartToy fontSize="small" />
              </Avatar>
              <Paper
                elevation={1}
                sx={{ p: 2, borderRadius: '16px 16px 16px 4px' }}
              >
                <Typography variant="body2">{streamBuf}</Typography>
              </Paper>
            </Box>
          </div>
        )}

        {isTyping && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              <SmartToy fontSize="small" />
            </Avatar>
            <Paper
              elevation={1}
              sx={{ p: 2, borderRadius: '16px 16px 16px 4px' }}
            >
              <Typography variant="body2">Typing...</Typography>
            </Paper>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: '0 0 12px 12px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth
            variant="outlined"
            placeholder="Ask me anything about your data..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isTyping}
            inputProps={{
              'aria-label': 'assistant-input',
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
              },
            }}
          />

          <IconButton
            color="primary"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
            sx={{ p: 1.5 }}
            aria-label="send"
          >
            <Send />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};

export default EnhancedAIAssistant;
