import React, { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Alert,
  LinearProgress,
  Grid,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  Person as PersonIcon,
  Lightbulb as InsightIcon,
  TrendingUp as TrendingIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Clear as ClearIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import AdvancedPatternDetection from './AdvancedPatternDetection';
import { useMutation } from '@apollo/client';
import { GENERATE_ENTITIES_FROM_TEXT } from '../../graphql/copilot.gql';
import { useI18n } from '../../hooks/useI18n';
import LocaleSelector from '../i18n/LocaleSelector';

// Helper function to generate localized AI responses
function getLocalizedResponses(t) {
  return {
    'analyze network': [
      t('copilot.responses.networkAnalysis.title'),
      '',
      t('copilot.responses.networkAnalysis.keyFindings'),
      '• ' + t('copilot.responses.networkAnalysis.detected', { count: 3 }),
      '• ' + t('copilot.responses.networkAnalysis.centralHub', { name: 'John Smith', percent: 85 }),
      '• ' + t('copilot.responses.networkAnalysis.activitySpike', { days: 30 }),
      '',
      t('copilot.responses.networkAnalysis.riskAssessment'),
      '• High: TechCorp Inc (financial irregularities)',
      '• Medium: Document #47 (incomplete verification)',
      '• Low: Standard employee connections',
      '',
      t('copilot.responses.networkAnalysis.recommendations'),
      "1. Investigate TechCorp's recent financial transactions",
      '2. Verify authenticity of Document #47',
      "3. Monitor John Smith's activity patterns",
    ],
    'threat assessment': [
      t('copilot.responses.threatAssessment.title'),
      '',
      t('copilot.responses.threatAssessment.currentLevel', { level: 'MODERATE' }),
      '',
      t('copilot.responses.threatAssessment.activeThreats'),
      '• Suspicious financial patterns (Score: 75/100)',
      '• Irregular communication networks (Score: 60/100)',
      '• Geographic anomalies (Score: 45/100)',
      '',
      t('copilot.responses.threatAssessment.threatVectors'),
      '1. **Financial:** Unusual large transactions',
      '2. **Communication:** Encrypted channels usage increase',
      '3. **Behavioral:** Meeting pattern changes',
      '',
      t('copilot.responses.threatAssessment.mitigation'),
      '• Enhanced monitoring of flagged entities',
      '• Cross-reference with external threat databases',
      '• Deploy additional surveillance protocols',
    ],
    'predict patterns': [
      t('copilot.responses.predictiveAnalysis.title'),
      '',
      t('copilot.responses.predictiveAnalysis.patternRecognition'),
      '• Weekly meeting cycles detected (92% confidence)',
      '• Communication burst patterns every 14 days',
      '• Geographic clustering around SF Bay Area',
      '',
      t('copilot.responses.predictiveAnalysis.futurePredictions', { days: 30 }),
      '• 78% probability of increased activity mid-month',
      '• Likely new connections: 2-3 additional entities',
      '• Expected communication volume: +35%',
      '',
      t('copilot.responses.predictiveAnalysis.anomalyAlerts'),
      '• Watch for unusual weekend activity',
      '• Monitor for new international connections',
      '• Flag transactions >$50K threshold',
    ],
    'investigation summary': [
      t('copilot.responses.investigationSummary.title'),
      '',
      t('copilot.responses.investigationSummary.caseOverview'),
      '• Total Entities: 47',
      '• Active Connections: 156',
      '• Investigation Duration: 23 days',
      '',
      t('copilot.responses.investigationSummary.keyEvidence'),
      '• 12 financial documents analyzed',
      '• 8 witness interviews completed',
      '• 34 communication records reviewed',
      '',
      t('copilot.responses.investigationSummary.currentStatus'),
      '• Evidence Quality: Strong (85%)',
      '• Case Completion: 67%',
      '• Confidence Level: High',
      '',
      t('copilot.responses.investigationSummary.nextSteps'),
      '1. Verify remaining financial transactions',
      '2. Interview 3 additional witnesses',
      '3. Cross-reference with database XYZ',
    ],
  };
}

function getQuickActions(t) {
  return [
    {
      label: t('copilot.analyzeNetwork'),
      icon: <TimelineIcon />,
      query: 'analyze network',
    },
    {
      label: t('copilot.threatAssessment'),
      icon: <SecurityIcon />,
      query: 'threat assessment',
    },
    {
      label: t('copilot.predictPatterns'),
      icon: <TrendingIcon />,
      query: 'predict patterns',
    },
    {
      label: t('copilot.investigationSummary'),
      icon: <InsightIcon />,
      query: 'investigation summary',
    },
  ];
}

function getAiInsights(t) {
  return [
    t('copilot.insights.moreConnections', { name: 'John Smith', percent: 40 }),
    t('copilot.insights.unusualActivity', { cluster: 'financial' }),
    t('copilot.insights.personsOfInterest', { count: 3 }),
    t('copilot.insights.communicationIncrease', { percent: 25 }),
    t('copilot.insights.crossReference', { caseId: '34B' }),
  ];
}

function ChatMessage({ message, isUser, isLoading, t }) {
  return (
    <ListItem
      sx={{
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 1,
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: isUser ? 'primary.main' : 'secondary.main' }}>
          {isUser ? <PersonIcon /> : <PsychologyIcon />}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Paper
            sx={{
              p: 2,
              bgcolor: isUser ? 'primary.light' : 'grey.100',
              color: isUser ? 'primary.contrastText' : 'text.primary',
              maxWidth: '80%',
              borderRadius: 2,
            }}
          >
            {isLoading ? (
              <Box>
                <Typography variant="body2">🤖 {t('copilot.analyzing')}</Typography>
                <LinearProgress sx={{ mt: 1 }} />
              </Box>
            ) : (
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-line',
                  '& strong': { fontWeight: 'bold' },
                  '& em': { fontStyle: 'italic' },
                }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                  ),
                }}
              />
            )}
          </Paper>
        }
      />
    </ListItem>
  );
}

export default function IntelligentCopilot() {
  const { t, locale } = useI18n();

  const getWelcomeMessage = () => ({
    id: 1,
    text: "👋 " + (locale === 'es-ES'
      ? "¡Hola! Soy tu Analista de Inteligencia con IA. Puedo ayudarte a analizar redes, evaluar amenazas, predecir patrones y generar perspectivas de tus datos de investigación. ¿Qué te gustaría explorar?"
      : "Hello! I'm your AI Intelligence Analyst. I can help you analyze networks, assess threats, predict patterns, and generate insights from your investigation data. What would you like to explore?"),
    isUser: false,
    timestamp: new Date(),
  });

  const [messages, setMessages] = useState([getWelcomeMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [generated, setGenerated] = useState({
    entities: [],
    relationships: [],
  });
  const [generateEntities, { loading: generating }] = useMutation(
    GENERATE_ENTITIES_FROM_TEXT,
  );
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text = inputValue) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI processing delay
    setTimeout(
      () => {
        const query = text.toLowerCase();
        const intelligentResponses = getLocalizedResponses(t);
        let aiResponse =
          (locale === 'es-ES'
            ? 'Entiendo que quieres saber sobre: ' + text + '\n\nAún estoy aprendiendo sobre este tema. Intenta preguntar sobre análisis de redes, evaluación de amenazas, predicción de patrones o resúmenes de investigación para obtener información más detallada.'
            : 'I understand you want to know about: ' + text + "\n\nI'm still learning about this topic. Try asking about network analysis, threat assessment, pattern prediction, or investigation summaries for more detailed insights.");

        // Find matching response
        for (const [key, response] of Object.entries(intelligentResponses)) {
          if (query.includes(key)) {
            aiResponse = response.join('\n');
            break;
          }
        }

        const aiMessage = {
          id: Date.now() + 1,
          text: aiResponse,
          isUser: false,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
        setIsLoading(false);
      },
      2000 + Math.random() * 1000,
    ); // Random delay 2-3 seconds
  };

  const handleQuickAction = (query) => {
    handleSendMessage(query);
  };

  const handleGenerate = async () => {
    if (!notes.trim()) return;
    const { data } = await generateEntities({
      variables: { investigationId: 'demo', text: notes },
    });
    setGenerated(data.generateEntitiesFromText);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "👋 " + (locale === 'es-ES'
          ? "¡Chat limpiado! Estoy listo para ayudar con tu análisis de inteligencia. ¿Qué te gustaría explorar?"
          : "Chat cleared! I'm ready to help with your intelligence analysis. What would you like to explore?"),
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  };

  const quickActions = getQuickActions(t);
  const aiInsights = getAiInsights(t);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom>
                🤖 {t('copilot.title')}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {t('copilot.subtitle')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <LocaleSelector variant="button" size="small" />
              <Tooltip title={t('copilot.clear')}>
                <IconButton onClick={clearChat} color="primary">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Magic From Text
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder={t('copilot.placeholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
            />
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={generating || !notes.trim()}
            >
              Generate Entities
            </Button>
          </Box>
          {generated.entities.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {generated.entities.map((e) => (
                <Chip key={e.id} label={e.label} sx={{ mr: 1, mb: 1 }} />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {/* AI Insights Panel */}
        <Grid item xs={12} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AutoAwesomeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {t('copilot.liveInsights')}
              </Typography>
              <List dense>
                {aiInsights.map((insight, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{ fontSize: '0.85rem' }}
                        >
                          {insight}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                {t('copilot.quickActions')}
              </Typography>
              <Grid container spacing={1}>
                {quickActions.map((action, index) => (
                  <Grid item xs={12} key={index}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={action.icon}
                      onClick={() => handleQuickAction(action.query)}
                      sx={{ justifyContent: 'flex-start', fontSize: '0.75rem' }}
                    >
                      {action.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Chat Interface */}
        <Grid item xs={12} lg={6}>
          <Card
            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <CardContent
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                p: 0,
              }}
            >
              {/* Messages Area */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: 'auto',
                  maxHeight: '60vh',
                  p: 1,
                }}
              >
                <List>
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message.text}
                      isUser={message.isUser}
                      t={t}
                    />
                  ))}
                  {isLoading && (
                    <ChatMessage message="" isUser={false} isLoading={true} t={t} />
                  )}
                </List>
                <div ref={messagesEndRef} />
              </Box>

              {/* Input Area */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem' }}>
                  {locale === 'es-ES'
                    ? '💡 Intenta preguntar: "analizar red", "evaluación de amenazas", "predecir patrones", o "resumen de investigación"'
                    : '💡 Try asking: "analyze network", "threat assessment", "predict patterns", or "investigation summary"'
                  }
                </Alert>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder={t('copilot.placeholder')}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading}
                    multiline
                    maxRows={3}
                  />
                  <Button
                    variant="contained"
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isLoading}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    <SendIcon />
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Advanced Pattern Detection */}
        <Grid item xs={12} lg={3}>
          <AdvancedPatternDetection />
        </Grid>
      </Grid>
    </Box>
  );
}
