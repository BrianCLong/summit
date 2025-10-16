import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Paper,
  Typography,
  IconButton,
  Fab,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Popper,
  ClickAwayListener,
  Fade,
  Alert,
  CircularProgress,
  Button,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Mic,
  MicOff,
  Send,
  Psychology,
  Search,
  History,
  Clear,
  FilterList,
  TrendingUp,
  AccountTree,
  LocationOn,
  Group,
  Schedule,
  Star,
  Warning,
  CheckCircle,
  Cancel,
  ExpandMore,
  Help,
  AutoAwesome,
  Lightbulb,
  QuestionMark,
} from '@mui/icons-material';
import SpeechRecognition, {
  useSpeechRecognition,
} from 'react-speech-recognition';

function NaturalLanguageQuery({ cy, onQueryResult, onQueryExecuted }) {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript && transcript !== query) {
      setQuery(transcript);
      generateSuggestions(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    // Load query history from localStorage
    const saved = localStorage.getItem('nlq_history');
    if (saved) {
      try {
        setQueryHistory(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading query history:', error);
      }
    }
  }, []);

  const saveToHistory = (queryText, results) => {
    const historyItem = {
      id: Date.now(),
      query: queryText,
      timestamp: new Date().toISOString(),
      resultCount: results?.nodes?.length || 0,
      success: true,
    };

    const newHistory = [historyItem, ...queryHistory.slice(0, 19)]; // Keep only 20 items
    setQueryHistory(newHistory);
    localStorage.setItem('nlq_history', JSON.stringify(newHistory));
  };

  const generateSuggestions = (queryText) => {
    if (!queryText || queryText.length < 3) {
      setSuggestions([]);
      return;
    }

    const suggestions = [];
    const lowerQuery = queryText.toLowerCase();

    // Entity type suggestions
    const entityTypes = [
      'person',
      'organization',
      'location',
      'document',
      'event',
    ];
    entityTypes.forEach((type) => {
      if (type.includes(lowerQuery)) {
        suggestions.push({
          type: 'entity_type',
          text: `Show all ${type}s`,
          icon: <Group />,
          confidence: 0.9,
        });
      }
    });

    // Relationship suggestions
    const relationships = [
      'connected to',
      'works for',
      'located at',
      'owns',
      'related to',
    ];
    relationships.forEach((rel) => {
      if (rel.includes(lowerQuery) || lowerQuery.includes(rel.split(' ')[0])) {
        suggestions.push({
          type: 'relationship',
          text: `Find entities ${rel} something`,
          icon: <AccountTree />,
          confidence: 0.8,
        });
      }
    });

    // Analysis suggestions
    const analysisPatterns = [
      {
        pattern: ['find', 'search', 'show'],
        text: 'Find entities matching criteria',
        icon: <Search />,
      },
      {
        pattern: ['analyze', 'analysis'],
        text: 'Perform network analysis',
        icon: <TrendingUp />,
      },
      {
        pattern: ['central', 'important', 'key'],
        text: 'Find central/important entities',
        icon: <Star />,
      },
      {
        pattern: ['isolated', 'disconnected'],
        text: 'Find isolated entities',
        icon: <Warning />,
      },
      {
        pattern: ['cluster', 'group'],
        text: 'Find clusters in the network',
        icon: <Group />,
      },
      {
        pattern: ['path', 'route', 'connection'],
        text: 'Find paths between entities',
        icon: <AccountTree />,
      },
    ];

    analysisPatterns.forEach(({ pattern, text, icon }) => {
      if (pattern.some((p) => lowerQuery.includes(p))) {
        suggestions.push({
          type: 'analysis',
          text,
          icon,
          confidence: 0.7,
        });
      }
    });

    // Example queries
    if (suggestions.length === 0) {
      const examples = [
        'Show all organizations in New York',
        'Find people connected to Acme Corp',
        'Analyze network centrality',
        'Find isolated entities',
        'Show recent events',
        'Find suspicious relationships',
      ];

      examples.forEach((example) => {
        if (example.toLowerCase().includes(lowerQuery)) {
          suggestions.push({
            type: 'example',
            text: example,
            icon: <Lightbulb />,
            confidence: 0.6,
          });
        }
      });
    }

    setSuggestions(suggestions.slice(0, 5));
  };

  const parseNaturalLanguageQuery = (queryText) => {
    const query = queryText.toLowerCase().trim();

    // Define parsing patterns
    const patterns = [
      // Show/Find entities
      {
        regex:
          /(?:show|find|get|list)\s+(?:all\s+)?(\w+)s?(?:\s+(?:in|at|from|near)\s+(.+))?/,
        handler: (matches) => ({
          action: 'filter',
          entityType: matches[1].toUpperCase(),
          location: matches[2]?.trim(),
          cypher: matches[2]
            ? `MATCH (n:${matches[1].toUpperCase()})-[:LOCATED_AT]->(l) WHERE l.label =~ '.*${matches[2]}.*' RETURN n`
            : `MATCH (n:${matches[1].toUpperCase()}) RETURN n`,
        }),
      },

      // Connected entities
      {
        regex:
          /(?:find|show|get)\s+(?:entities|nodes|people|organizations)?\s*(?:connected|linked|related)\s+to\s+(.+)/,
        handler: (matches) => ({
          action: 'connected',
          target: matches[1].trim(),
          cypher: `MATCH (target)-[r]-(connected) WHERE target.label =~ '.*${matches[1]}.*' RETURN target, r, connected`,
        }),
      },

      // Paths between entities
      {
        regex:
          /(?:find|show|get)\s+(?:path|route|connection)s?\s+(?:between|from)\s+(.+?)\s+(?:to|and)\s+(.+)/,
        handler: (matches) => ({
          action: 'path',
          source: matches[1].trim(),
          target: matches[2].trim(),
          cypher: `MATCH path = shortestPath((source)-[*]-(target)) WHERE source.label =~ '.*${matches[1]}.*' AND target.label =~ '.*${matches[2]}.*' RETURN path`,
        }),
      },

      // Centrality analysis
      {
        regex:
          /(?:analyze|find|show)\s+(?:central|important|key|hub)\s+(?:entities|nodes)/,
        handler: () => ({
          action: 'centrality',
          cypher:
            'MATCH (n)-[r]-() WITH n, count(r) as degree ORDER BY degree DESC LIMIT 10 RETURN n, degree',
        }),
      },

      // Isolated entities
      {
        regex:
          /(?:find|show|get)\s+(?:isolated|disconnected|orphan)\s+(?:entities|nodes)/,
        handler: () => ({
          action: 'isolated',
          cypher: 'MATCH (n) WHERE NOT (n)-[]-() RETURN n',
        }),
      },

      // Recent entities (with date)
      {
        regex: /(?:find|show|get)\s+(?:recent|new|latest)\s+(\w+)s?/,
        handler: (matches) => ({
          action: 'recent',
          entityType: matches[1].toUpperCase(),
          cypher: `MATCH (n:${matches[1].toUpperCase()}) WHERE n.created_at > datetime() - duration('P30D') RETURN n ORDER BY n.created_at DESC`,
        }),
      },

      // Suspicious/anomalous entities
      {
        regex:
          /(?:find|show|get)\s+(?:suspicious|anomalous|unusual|strange)\s+(?:entities|relationships|connections)/,
        handler: () => ({
          action: 'anomalous',
          cypher:
            'MATCH (n)-[r]-() WITH n, count(r) as degree WHERE degree > 10 RETURN n, degree ORDER BY degree DESC',
        }),
      },

      // Clusters
      {
        regex: /(?:find|show|analyze)\s+(?:clusters|groups|communities)/,
        handler: () => ({
          action: 'clusters',
          cypher:
            'CALL gds.louvain.stream("myGraph") YIELD nodeId, communityId RETURN nodeId, communityId',
        }),
      },
    ];

    // Try to match patterns
    for (const pattern of patterns) {
      const matches = query.match(pattern.regex);
      if (matches) {
        return pattern.handler(matches);
      }
    }

    // Fallback: keyword search
    const keywords = query.split(/\s+/).filter((word) => word.length > 2);
    if (keywords.length > 0) {
      return {
        action: 'search',
        keywords,
        cypher: `MATCH (n) WHERE any(keyword IN [${keywords.map((k) => `'${k}'`).join(', ')}] WHERE n.label =~ ('.*' + keyword + '.*')) RETURN n`,
      };
    }

    return null;
  };

  const executeQuery = async (queryText = query) => {
    if (!queryText.trim() || !cy) return;

    setLoading(true);
    setResults(null);

    try {
      const parsedQuery = parseNaturalLanguageQuery(queryText);

      if (!parsedQuery) {
        setResults({
          error:
            'Could not understand the query. Please try rephrasing or use the help examples.',
          suggestions: [
            'Show all organizations',
            'Find people connected to John Doe',
            'Analyze network centrality',
            'Find isolated entities',
          ],
        });
        setLoading(false);
        return;
      }

      // Execute the parsed query
      const results = await executeGraphQuery(parsedQuery);

      setResults(results);
      saveToHistory(queryText, results);

      if (onQueryResult) {
        onQueryResult(results);
      }

      if (onQueryExecuted) {
        onQueryExecuted(parsedQuery, results);
      }
    } catch (error) {
      console.error('Error executing query:', error);
      setResults({
        error: error.message,
        suggestion: 'Please try a different query or check the syntax.',
      });
    } finally {
      setLoading(false);
    }
  };

  const executeGraphQuery = async (parsedQuery) => {
    if (!cy) throw new Error('Graph not available');

    const results = {
      action: parsedQuery.action,
      nodes: [],
      edges: [],
      metadata: {},
    };

    switch (parsedQuery.action) {
      case 'filter':
        const filteredNodes = cy.nodes().filter((node) => {
          const nodeData = node.data();
          let matches = true;

          if (parsedQuery.entityType && parsedQuery.entityType !== 'ENTITY') {
            matches = matches && nodeData.type === parsedQuery.entityType;
          }

          if (parsedQuery.location) {
            const locationText = (
              nodeData.properties?.location ||
              nodeData.properties?.address ||
              ''
            ).toLowerCase();
            matches =
              matches &&
              locationText.includes(parsedQuery.location.toLowerCase());
          }

          return matches;
        });

        results.nodes = filteredNodes.map((n) => n.data());
        results.metadata.count = filteredNodes.length;

        // Highlight in graph
        cy.elements().removeClass('highlighted');
        filteredNodes.addClass('highlighted');
        break;

      case 'connected':
        const targetNodes = cy
          .nodes()
          .filter((node) =>
            node
              .data()
              .label?.toLowerCase()
              .includes(parsedQuery.target.toLowerCase()),
          );

        if (targetNodes.length > 0) {
          const targetNode = targetNodes[0];
          const connectedElements = targetNode.neighborhood().union(targetNode);

          results.nodes = connectedElements.nodes().map((n) => n.data());
          results.edges = connectedElements.edges().map((e) => e.data());
          results.metadata.target = targetNode.data();
          results.metadata.count = connectedElements.nodes().length - 1; // Exclude target

          // Highlight in graph
          cy.elements().removeClass('highlighted');
          connectedElements.addClass('highlighted');
        }
        break;

      case 'path':
        const sourceNodes = cy
          .nodes()
          .filter((node) =>
            node
              .data()
              .label?.toLowerCase()
              .includes(parsedQuery.source.toLowerCase()),
          );
        const targetNodesCandidates = cy
          .nodes()
          .filter((node) =>
            node
              .data()
              .label?.toLowerCase()
              .includes(parsedQuery.target.toLowerCase()),
          );

        if (sourceNodes.length > 0 && targetNodesCandidates.length > 0) {
          const source = sourceNodes[0];
          const target = targetNodesCandidates[0];

          // Simple BFS to find shortest path
          const path = findShortestPath(cy, source, target);

          if (path.length > 0) {
            results.nodes = path.nodes.map((n) => n.data());
            results.edges = path.edges.map((e) => e.data());
            results.metadata.pathLength = path.length;
            results.metadata.source = source.data();
            results.metadata.target = target.data();

            // Highlight path in graph
            cy.elements().removeClass('highlighted');
            path.nodes.addClass('highlighted');
            path.edges.addClass('highlighted');
          } else {
            results.error = 'No path found between the specified entities';
          }
        } else {
          results.error = 'Could not find the specified entities';
        }
        break;

      case 'centrality':
        const centralityData = cy
          .nodes()
          .map((node) => ({
            node: node.data(),
            degree: node.degree(),
            betweenness: calculateBetweennessCentrality(cy, node),
            closeness: calculateClosenessCentrality(cy, node),
          }))
          .sort((a, b) => b.degree - a.degree)
          .slice(0, 10);

        results.nodes = centralityData.map((d) => d.node);
        results.metadata.centrality = centralityData;
        results.metadata.count = centralityData.length;

        // Highlight top central nodes
        cy.elements().removeClass('highlighted');
        centralityData.slice(0, 5).forEach((d) => {
          cy.getElementById(d.node.id).addClass('highlighted');
        });
        break;

      case 'isolated':
        const isolatedNodes = cy.nodes().filter((node) => node.degree() === 0);

        results.nodes = isolatedNodes.map((n) => n.data());
        results.metadata.count = isolatedNodes.length;

        // Highlight isolated nodes
        cy.elements().removeClass('highlighted');
        isolatedNodes.addClass('highlighted');
        break;

      case 'search':
        const searchResults = cy.nodes().filter((node) => {
          const nodeData = node.data();
          const searchText = (
            nodeData.label +
            ' ' +
            (nodeData.type || '') +
            ' ' +
            JSON.stringify(nodeData.properties || {})
          ).toLowerCase();

          return parsedQuery.keywords.some((keyword) =>
            searchText.includes(keyword.toLowerCase()),
          );
        });

        results.nodes = searchResults.map((n) => n.data());
        results.metadata.keywords = parsedQuery.keywords;
        results.metadata.count = searchResults.length;

        // Highlight search results
        cy.elements().removeClass('highlighted');
        searchResults.addClass('highlighted');
        break;

      default:
        throw new Error(`Unknown action: ${parsedQuery.action}`);
    }

    return results;
  };

  // Helper function to find shortest path
  const findShortestPath = (cy, source, target) => {
    const visited = new Set();
    const queue = [{ node: source, path: [source], edges: [] }];

    while (queue.length > 0) {
      const { node, path, edges } = queue.shift();

      if (node.id() === target.id()) {
        return { nodes: path, edges, length: path.length - 1 };
      }

      if (visited.has(node.id())) continue;
      visited.add(node.id());

      node.connectedEdges().forEach((edge) => {
        const otherNode = edge.otherNode(node);
        if (!visited.has(otherNode.id())) {
          queue.push({
            node: otherNode,
            path: [...path, otherNode],
            edges: [...edges, edge],
          });
        }
      });
    }

    return { nodes: [], edges: [], length: 0 };
  };

  // Simplified centrality calculations
  const calculateBetweennessCentrality = (cy, node) => {
    // Simplified calculation - count shortest paths passing through node
    let betweenness = 0;
    const allNodes = cy.nodes();

    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        if (allNodes[i].id() !== node.id() && allNodes[j].id() !== node.id()) {
          const path = findShortestPath(cy, allNodes[i], allNodes[j]);
          if (path.nodes.some((n) => n.id() === node.id())) {
            betweenness++;
          }
        }
      }
    }

    return betweenness;
  };

  const calculateClosenessCentrality = (cy, node) => {
    const distances = [];
    cy.nodes().forEach((otherNode) => {
      if (otherNode.id() !== node.id()) {
        const path = findShortestPath(cy, node, otherNode);
        if (path.length > 0) {
          distances.push(path.length);
        }
      }
    });

    if (distances.length === 0) return 0;
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    return avgDistance > 0 ? 1 / avgDistance : 0;
  };

  const startListening = () => {
    if (!browserSupportsSpeechRecognition) {
      alert('Your browser does not support speech recognition');
      return;
    }

    resetTranscript();
    SpeechRecognition.startListening({ continuous: true });
    setIsListening(true);
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    setIsListening(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.text);
    setSuggestions([]);
    executeQuery(suggestion.text);
  };

  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem.query);
    setShowHistory(false);
    executeQuery(historyItem.query);
  };

  const exampleQueries = [
    'Show all organizations in New York',
    'Find people connected to John Doe',
    'Analyze network centrality',
    'Find isolated entities',
    'Show paths between Acme Corp and Document A',
    'Find suspicious relationships',
    'Show recent events',
    'Find clusters in the network',
  ];

  return (
    <Box>
      {/* Main Query Input */}
      <Box sx={{ position: 'relative', mb: 2 }}>
        <TextField
          ref={inputRef}
          fullWidth
          variant="outlined"
          placeholder="Ask anything about the graph... (e.g., 'Show all organizations' or 'Find paths between John and Acme')"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            generateSuggestions(e.target.value);
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              executeQuery();
            }
          }}
          onFocus={(e) => setAnchorEl(e.currentTarget)}
          InputProps={{
            endAdornment: (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {browserSupportsSpeechRecognition && (
                  <IconButton
                    onClick={isListening ? stopListening : startListening}
                    color={isListening ? 'error' : 'default'}
                  >
                    {isListening ? <MicOff /> : <Mic />}
                  </IconButton>
                )}
                <IconButton onClick={() => setShowHistory(!showHistory)}>
                  <History />
                </IconButton>
                <IconButton onClick={() => setShowHelp(true)}>
                  <Help />
                </IconButton>
                <IconButton
                  onClick={() => executeQuery()}
                  disabled={!query.trim() || loading}
                  color="primary"
                >
                  {loading ? <CircularProgress size={20} /> : <Send />}
                </IconButton>
              </Box>
            ),
          }}
        />

        {/* Suggestions Popup */}
        <Popper
          open={suggestions.length > 0 && Boolean(anchorEl)}
          anchorEl={anchorEl}
          placement="bottom-start"
          style={{ zIndex: 1300, width: anchorEl?.offsetWidth }}
        >
          <ClickAwayListener onClickAway={() => setSuggestions([])}>
            <Paper elevation={3} sx={{ mt: 1 }}>
              <List dense>
                {suggestions.map((suggestion, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemButton onClick={() => handleSuggestionClick(suggestion)}>
                      <ListItemIcon>{suggestion.icon}</ListItemIcon>
                      <ListItemText
                        primary={suggestion.text}
                        secondary={
                          <Chip
                            label={`${(suggestion.confidence * 100).toFixed(0)}%`}
                            size="small"
                            variant="outlined"
                          />
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </ClickAwayListener>
        </Popper>
      </Box>

      {/* Status Indicators */}
      {isListening && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Mic />
            Listening... Speak your query
            <Button size="small" onClick={stopListening}>
              Stop
            </Button>
          </Box>
        </Alert>
      )}

      {/* Query Results */}
      {results && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            {results.error ? (
              <Alert severity="error">
                <Typography variant="body2">{results.error}</Typography>
                {results.suggestions && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption">
                      Try these instead:
                    </Typography>
                    {results.suggestions.map((suggestion, index) => (
                      <Chip
                        key={index}
                        label={suggestion}
                        size="small"
                        onClick={() =>
                          handleSuggestionClick({ text: suggestion })
                        }
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
              </Alert>
            ) : (
              <>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
                >
                  <CheckCircle color="success" />
                  <Typography variant="h6">Query Results</Typography>
                  <Badge
                    badgeContent={
                      results.metadata?.count || results.nodes?.length || 0
                    }
                    color="primary"
                  >
                    <Chip label={results.action} variant="outlined" />
                  </Badge>
                </Box>

                {results.nodes && results.nodes.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>
                        Found {results.nodes.length} entities
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {results.nodes.slice(0, 10).map((node, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Chip
                                label={node.type}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={node.label}
                              secondary={`ID: ${node.id}`}
                            />
                          </ListItem>
                        ))}
                        {results.nodes.length > 10 && (
                          <Typography variant="caption" color="text.secondary">
                            ... and {results.nodes.length - 10} more
                          </Typography>
                        )}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

                {results.metadata &&
                  Object.keys(results.metadata).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Analysis Details:
                      </Typography>
                      <pre style={{ fontSize: '0.75rem', color: '#666' }}>
                        {JSON.stringify(results.metadata, null, 2)}
                      </pre>
                    </Box>
                  )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Query History */}
      {showHistory && queryHistory.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Queries
            </Typography>
            <List dense>
              {queryHistory.slice(0, 5).map((item) => (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton onClick={() => handleHistoryClick(item)}>
                    <ListItemIcon>
                      <History />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.query}
                      secondary={`${new Date(item.timestamp).toLocaleString()} • ${item.resultCount} results`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Help Dialog */}
      <Dialog
        open={showHelp}
        onClose={() => setShowHelp(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Natural Language Query Help</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Example Queries:
          </Typography>
          <List>
            {exampleQueries.map((example, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  onClick={() => {
                    setQuery(example);
                    setShowHelp(false);
                    executeQuery(example);
                  }}
                >
                  <ListItemIcon>
                    <QuestionMark />
                  </ListItemIcon>
                  <ListItemText primary={example} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Query Patterns:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Entity Queries"
                secondary="'Show all [entities]', 'Find [entity type] in [location]'"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Relationship Queries"
                secondary="'Find entities connected to [name]', 'Show paths between [A] and [B]'"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Analysis Queries"
                secondary="'Analyze centrality', 'Find clusters', 'Show isolated entities'"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Filter Queries"
                secondary="'Show recent [entities]', 'Find suspicious relationships'"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelp(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default NaturalLanguageQuery;
