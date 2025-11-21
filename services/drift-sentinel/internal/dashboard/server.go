package dashboard

import (
	"encoding/json"
	"html/template"
	"net/http"

	"github.com/summit/drift-sentinel/internal/sentinel"
)

// HistoryReader describes the subset of the sentinel exposed to the dashboard layer.
type HistoryReader interface {
	DriftHistory() []sentinel.DriftPoint
}

// Server renders a tiny HTTP UI that plots drift metrics over time.
type Server struct {
	reader HistoryReader
	mux    *http.ServeMux
}

// NewServer returns an HTTP handler that serves both JSON time series data and a
// lightweight HTML dashboard with inline JavaScript for plotting.
func NewServer(reader HistoryReader) *Server {
	s := &Server{reader: reader, mux: http.NewServeMux()}
	s.mux.HandleFunc("/metrics", s.handleMetrics)
	s.mux.HandleFunc("/", s.handleIndex)
	return s
}

// Handler exposes the internal http.ServeMux so the caller can mount the dashboard into
// an existing server.
func (s *Server) Handler() http.Handler {
	return s.mux
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	history := s.reader.DriftHistory()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"points": history})
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	tmpl := template.Must(template.New("index").Parse(indexHTML))
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = tmpl.Execute(w, nil)
}

const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Shadow Model Drift Sentinel</title>
<style>
body { font-family: sans-serif; margin: 2rem; }
canvas { max-width: 960px; }
section { margin-bottom: 2rem; }
</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
<h1>Shadow-Model Drift Sentinel</h1>
<section>
<p>Population Stability Index, KL divergence, and error delta plotted over time.</p>
<canvas id="driftChart"></canvas>
</section>
<script>
async function fetchMetrics() {
  const res = await fetch('/metrics');
  const data = await res.json();
  return data.points || [];
}

function renderChart(points) {
  const labels = points.map(p => new Date(p.timestamp).toLocaleTimeString());
  const psi = points.map(p => p.psi);
  const kl = points.map(p => p.kl);
  const delta = points.map(p => p.error_delta);
  const ctx = document.getElementById('driftChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'PSI', data: psi, borderColor: '#2563eb', fill: false },
        { label: 'KL Divergence', data: kl, borderColor: '#dc2626', fill: false },
        { label: 'Error Delta', data: delta, borderColor: '#16a34a', fill: false }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        x: { title: { display: true, text: 'Time' } },
        y: { title: { display: true, text: 'Magnitude' } }
      }
    }
  });
}

(async () => {
  const points = await fetchMetrics();
  renderChart(points);
  setInterval(async () => {
    const next = await fetchMetrics();
    renderChart(next);
  }, 10000);
})();
</script>
</body>
</html>`
