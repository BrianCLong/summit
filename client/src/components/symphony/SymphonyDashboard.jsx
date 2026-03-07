import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Box,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

const SymphonyDashboard = () => {
  const [healthStatus, setHealthStatus] = useState("checking...");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  const tabs = [
    { id: "dashboard", name: "Dashboard" },
    { id: "routing", name: "Routing Studio" },
    { id: "rag", name: "RAG Console" },
    { id: "neo4j", name: "Neo4j Guard" },
    { id: "budgets", name: "Budgets & Burndown" },
    { id: "policies", name: "Policies & LOA" },
    { id: "observability", name: "Observability" },
    { id: "ci-chaos", name: "CI & Chaos" },
    { id: "docs", name: "Docs & Runbooks" },
  ];

  const recentRoutes = [
    {
      task: "nl2cy",
      model: "local/llama",
      loa: 1,
      cost: 0.0,
      tokens: 245,
    },
    {
      task: "rag",
      model: "local/qwen-coder",
      loa: 1,
      cost: 0.0,
      tokens: 180,
    },
  ];

  const recentLogs = [
    "15:05 model=local/llama p95=120ms",
    "15:04 route plan ok",
    "15:03 neo4j guard applied 001_init",
  ];

  useEffect(() => {
    // Simulate initializing system status
    setTimeout(() => {
      setHealthStatus("operational");
      setIsLoading(false);
      setLastUpdate(new Date());
    }, 1000);
  }, []);

  const getHealthStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "operational":
      case "green":
      case "up":
        return "#10b981";
      case "warning":
      case "degraded":
        return "#f59e0b";
      case "error":
      case "critical":
      case "down":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLastUpdate(new Date());
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#f9fafb",
      }}
    >
      {/* Enhanced Header */}
      <AppBar
        position="sticky"
        sx={{
          background: "linear-gradient(135deg, #1e40af 0%, #3730a3 100%)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          zIndex: 1200,
        }}
      >
        <Toolbar sx={{ minHeight: "64px !important" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🎼</span>
            <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
              SYMPHONY
            </Typography>
            <Typography variant="subtitle2" sx={{ opacity: 0.8, ml: 1 }}>
              ▸ {tabs.find((t) => t.id === activeTab)?.name || "Dashboard"}
            </Typography>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginLeft: "auto" }}>
            {/* Status indicators */}
            {[
              { name: "Models", count: 7, status: "up" },
              { name: "Ollama", status: "up" },
              { name: "LiteLLM", status: "up" },
              { name: "Neo4j", status: "up" },
              { name: "Federation", status: "ready" },
            ].map((service, index) => (
              <div key={index} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor:
                      service.status === "up" || service.status === "ready" ? "#10b981" : "#ef4444",
                    animation: "pulse 2s infinite",
                  }}
                ></div>
                <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.9)" }}>
                  {service.name}
                  {service.count ? `:${service.count}` : ""}: {service.status.toUpperCase()}
                </Typography>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginLeft: "1rem" }}>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.9)" }}>
              ENV: dev
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.9)" }}>
              LOA: 1
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.9)" }}>
              Kill: OFF
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.9)" }}>
              {lastUpdate.toLocaleTimeString()}
            </Typography>
            <Button
              startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outlined"
              size="small"
              sx={{
                color: "white",
                borderColor: "rgba(255, 255, 255, 0.3)",
                "&:hover": {
                  borderColor: "rgba(255, 255, 255, 0.5)",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </Toolbar>
      </AppBar>

      {/* Navigation Tabs */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            padding: "0.5rem 1rem",
            gap: "0.5rem",
            minWidth: "fit-content",
            scrollbarWidth: "thin",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                fontWeight: activeTab === tab.id ? "600" : "400",
                backgroundColor: activeTab === tab.id ? "#3b82f6" : "transparent",
                color: activeTab === tab.id ? "white" : "#374151",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          background: "#f9fafb",
          padding: "1.5rem 0",
        }}
      >
        <Container maxWidth="xl" sx={{ px: 2 }}>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "400px",
              }}
            >
              <CircularProgress size={60} />
            </div>
          ) : (
            <>
              {/* Status Summary Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: "linear-gradient(to bottom right, #ffffff, #f9fafb)",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        mb: 2,
                        color: "#1f2937",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      Health:
                      <span
                        style={{
                          color: getHealthStatusColor(healthStatus),
                          textTransform: "uppercase",
                        }}
                      >
                        {healthStatus}
                      </span>
                    </Typography>
                    <Grid container spacing={3} sx={{ textAlign: "center", mb: 2 }}>
                      <Grid item xs={6} md={3}>
                        <div>
                          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#059669" }}>
                            120ms
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>p50</div>
                        </div>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <div>
                          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#059669" }}>
                            480ms
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>p95</div>
                        </div>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <div>
                          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2563eb" }}>
                            1.2
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>RPS</div>
                        </div>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <div>
                          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#7c3aed" }}>
                            7m
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>RAG Fresh</div>
                        </div>
                      </Grid>
                    </Grid>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: "#f3f4f6",
                        borderRadius: 1,
                        fontSize: "0.875rem",
                        fontFamily: "monospace",
                      }}
                    >
                      <strong>[Budgets]</strong> OpenRouter: $0 / $10 (0%) reset 00:12:32
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: "linear-gradient(to bottom right, #ffffff, #f9fafb)",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: "#1f2937" }}>
                      Queue / Errors
                    </Typography>
                    <Grid container spacing={3} sx={{ textAlign: "center" }}>
                      <Grid item xs={4}>
                        <div>
                          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#2563eb" }}>
                            12
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Queue</div>
                        </div>
                      </Grid>
                      <Grid item xs={4}>
                        <div>
                          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#059669" }}>
                            0
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Errors(15m)</div>
                        </div>
                      </Grid>
                      <Grid item xs={4}>
                        <div>
                          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#6b7280" }}>
                            0
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>DLQ</div>
                        </div>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>

              {/* Performance Charts Placeholder */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: "linear-gradient(to bottom right, #ffffff, #f9fafb)",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: "#1f2937" }}>
                      Performance Trends (last 7 days)
                    </Typography>
                    <div
                      style={{
                        height: 300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#f8fafc",
                        borderRadius: "8px",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Interactive chart would appear here
                      </Typography>
                    </div>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: "linear-gradient(to bottom right, #ffffff, #f9fafb)",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: "#1f2937" }}>
                      RPS Trends (last 7 days)
                    </Typography>
                    <div
                      style={{
                        height: 300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#f8fafc",
                        borderRadius: "8px",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Interactive chart would appear here
                      </Typography>
                    </div>
                  </Paper>
                </Grid>
              </Grid>

              {/* Quick Actions */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: "linear-gradient(to bottom right, #ffffff, #f9fafb)",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: "#1f2937" }}>
                      Quick Actions
                    </Typography>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CheckCircleIcon />}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        Run Smoke
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<WarningIcon />}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        Chaos Drill
                      </Button>
                      <Button
                        variant="outlined"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        ValidateCfg
                      </Button>
                    </div>
                  </Paper>
                </Grid>
              </Grid>

              {/* Recent Activity */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: "linear-gradient(to bottom right, #ffffff, #f9fafb)",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: "#1f2937" }}>
                      Recent Routes (10)
                    </Typography>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 1fr)",
                        gap: "0.5rem",
                        textAlign: "center",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#64748b",
                        mb: 1,
                        borderBottom: "1px solid #e5e7eb",
                        paddingBottom: "0.5rem",
                      }}
                    >
                      <div>task</div>
                      <div>model</div>
                      <div>LOA</div>
                      <div>cost</div>
                      <div>tok</div>
                    </div>
                    {recentRoutes.map((route, index) => (
                      <div
                        key={index}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, 1fr)",
                          gap: "0.5rem",
                          textAlign: "center",
                          fontSize: "0.875rem",
                          marginBottom: "0.5rem",
                          fontFamily: "monospace",
                        }}
                      >
                        <div>{route.task}</div>
                        <div style={{ color: "#2563eb" }}>…/{route.model.split("/")[1]}</div>
                        <div>{route.loa}</div>
                        <div>${route.cost.toFixed(3)}</div>
                        <div>{route.tokens}</div>
                      </div>
                    ))}
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: "linear-gradient(to bottom right, #ffffff, #f9fafb)",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: "#1f2937" }}>
                      Recent Logs (tail)
                    </Typography>
                    <div
                      style={{
                        maxHeight: "300px",
                        overflowY: "auto",
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                        backgroundColor: "#f8fafc",
                        padding: "0.75rem",
                        borderRadius: "4px",
                        border: "1px solid #e2e8f0",
                      }}
                      aria-label="Recent system logs"
                    >
                      {recentLogs.map((log, index) => (
                        <div key={index} style={{ color: "#374151", marginBottom: "0.25rem" }}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
        </Container>
      </main>

      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .status-indicator {
          animation: pulse 2s infinite;
        }

        /* Hide scrollbar for Chrome/Safari/Opera */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hide {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
    </div>
  );
};

export default SymphonyDashboard;
