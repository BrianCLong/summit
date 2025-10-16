import React, { useState, useRef, useEffect } from "react";
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
} from "@mui/material";
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
} from "@mui/icons-material";
import AdvancedPatternDetection from "./AdvancedPatternDetection";
import { useMutation } from "@apollo/client";
import { GENERATE_ENTITIES_FROM_TEXT } from "../../graphql/copilot.gql";

// Simulated AI responses for demo
const intelligentResponses = {
  "analyze network": [
    "🔍 **Network Analysis Complete**",
    "",
    "**Key Findings:**",
    "• Detected 3 potential risk clusters in the relationship graph",
    "• John Smith appears to be a central hub with 85% connectivity",
    "• Unusual activity spike detected in the last 30 days",
    "",
    "**Risk Assessment:**",
    "• High: TechCorp Inc (financial irregularities)",
    "• Medium: Document #47 (incomplete verification)",
    "• Low: Standard employee connections",
    "",
    "**Recommendations:**",
    "1. Investigate TechCorp's recent financial transactions",
    "2. Verify authenticity of Document #47",
    "3. Monitor John Smith's activity patterns",
  ],
  "threat assessment": [
    "🛡️ **Threat Assessment Report**",
    "",
    "**Current Threat Level: MODERATE**",
    "",
    "**Active Threats Identified:**",
    "• Suspicious financial patterns (Score: 75/100)",
    "• Irregular communication networks (Score: 60/100)",
    "• Geographic anomalies (Score: 45/100)",
    "",
    "**Threat Vectors:**",
    "1. **Financial:** Unusual large transactions",
    "2. **Communication:** Encrypted channels usage increase",
    "3. **Behavioral:** Meeting pattern changes",
    "",
    "**Mitigation Strategies:**",
    "• Enhanced monitoring of flagged entities",
    "• Cross-reference with external threat databases",
    "• Deploy additional surveillance protocols",
  ],
  "predict patterns": [
    "🔮 **Predictive Analysis Results**",
    "",
    "**Pattern Recognition:**",
    "• Weekly meeting cycles detected (92% confidence)",
    "• Communication burst patterns every 14 days",
    "• Geographic clustering around SF Bay Area",
    "",
    "**Future Predictions (Next 30 days):**",
    "• 78% probability of increased activity mid-month",
    "• Likely new connections: 2-3 additional entities",
    "• Expected communication volume: +35%",
    "",
    "**Anomaly Alerts:**",
    "• Watch for unusual weekend activity",
    "• Monitor for new international connections",
    "• Flag transactions >$50K threshold",
  ],
  "investigation summary": [
    "📊 **Investigation Summary**",
    "",
    "**Case Overview:**",
    "• Total Entities: 47",
    "• Active Connections: 156",
    "• Investigation Duration: 23 days",
    "",
    "**Key Evidence:**",
    "• 12 financial documents analyzed",
    "• 8 witness interviews completed",
    "• 34 communication records reviewed",
    "",
    "**Current Status:**",
    "• Evidence Quality: Strong (85%)",
    "• Case Completion: 67%",
    "• Confidence Level: High",
    "",
    "**Next Steps:**",
    "1. Verify remaining financial transactions",
    "2. Interview 3 additional witnesses",
    "3. Cross-reference with database XYZ",
  ],
};

const quickActions = [
  {
    label: "Analyze Network",
    icon: <TimelineIcon />,
    query: "analyze network",
  },
  {
    label: "Threat Assessment",
    icon: <SecurityIcon />,
    query: "threat assessment",
  },
  {
    label: "Predict Patterns",
    icon: <TrendingIcon />,
    query: "predict patterns",
  },
  {
    label: "Investigation Summary",
    icon: <InsightIcon />,
    query: "investigation summary",
  },
];

const aiInsights = [
  "💡 John Smith has 40% more connections than average",
  "⚠️ Unusual activity detected in financial cluster",
  "🎯 3 new potential persons of interest identified",
  "📈 Communication patterns show 25% increase",
  "🔍 Cross-reference opportunity with Case #34B",
];

function ChatMessage({ message, isUser, isLoading }) {
  return (
    <ListItem
      sx={{
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
        gap: 1,
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: isUser ? "primary.main" : "secondary.main" }}>
          {isUser ? <PersonIcon /> : <PsychologyIcon />}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Paper
            sx={{
              p: 2,
              bgcolor: isUser ? "primary.light" : "grey.100",
              color: isUser ? "primary.contrastText" : "text.primary",
              maxWidth: "80%",
              borderRadius: 2,
            }}
          >
            {isLoading ? (
              <Box>
                <Typography variant="body2">🤖 Analyzing...</Typography>
                <LinearProgress sx={{ mt: 1 }} />
              </Box>
            ) : (
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: "pre-line",
                  "& strong": { fontWeight: "bold" },
                  "& em": { fontStyle: "italic" },
                }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(message.replace(
                    /\*\*(.*?)\*\*/g,
                    "<strong>$1</strong>",
                  )),
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
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "👋 Hello! I'm your AI Intelligence Analyst. I can help you analyze networks, assess threats, predict patterns, and generate insights from your investigation data. What would you like to explore?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [generated, setGenerated] = useState({
    entities: [],
    relationships: [],
  });
  const [generateEntities, { loading: generating }] = useMutation(
    GENERATE_ENTITIES_FROM_TEXT,
  );
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    setInputValue("");
    setIsLoading(true);

    // Simulate AI processing delay
    setTimeout(
      () => {
        const query = text.toLowerCase();
        let aiResponse =
          "I understand you want to know about: " +
          text +
          "\n\nI'm still learning about this topic. Try asking about network analysis, threat assessment, pattern prediction, or investigation summaries for more detailed insights.";

        // Find matching response
        for (const [key, response] of Object.entries(intelligentResponses)) {
          if (query.includes(key)) {
            aiResponse = response.join("\n");
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
      variables: { investigationId: "demo", text: notes },
    });
    setGenerated(data.generateEntitiesFromText);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "👋 Chat cleared! I'm ready to help with your intelligence analysis. What would you like to explore?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="h4" gutterBottom>
                🤖 AI Intelligence Copilot
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Your AI-powered analyst for pattern recognition, threat
                assessment, and investigative insights
              </Typography>
            </Box>
            <Tooltip title="Clear Chat">
              <IconButton onClick={clearChat} color="primary">
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Magic From Text
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Paste notes or summary..."
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
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AutoAwesomeIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Live Insights
              </Typography>
              <List dense>
                {aiInsights.map((insight, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{ fontSize: "0.85rem" }}
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
                Quick Actions
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
                      sx={{ justifyContent: "flex-start", fontSize: "0.75rem" }}
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
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            <CardContent
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                p: 0,
              }}
            >
              {/* Messages Area */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: "auto",
                  maxHeight: "60vh",
                  p: 1,
                }}
              >
                <List>
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message.text}
                      isUser={message.isUser}
                    />
                  ))}
                  {isLoading && (
                    <ChatMessage message="" isUser={false} isLoading={true} />
                  )}
                </List>
                <div ref={messagesEndRef} />
              </Box>

              {/* Input Area */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
                <Alert severity="info" sx={{ mb: 2, fontSize: "0.85rem" }}>
                  💡 Try asking: "analyze network", "threat assessment",
                  "predict patterns", or "investigation summary"
                </Alert>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Ask me about patterns, threats, connections, or investigations..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={isLoading}
                    multiline
                    maxRows={3}
                  />
                  <Button
                    variant="contained"
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isLoading}
                    sx={{ minWidth: "auto", px: 2 }}
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
