import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import Dashboard from './components/Dashboard';
import IngestWizard from './components/IngestWizard';
import LanguageSwitcher from './components/LanguageSwitcher';
import LoginPage from './components/LoginPage';
import { EventItem, GraphData } from './types';
import './App.css';

function App() {
  const { t, ready } = useTranslation('common');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [neighborhoodMode, setNeighborhoodMode] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => {
        const formattedNodes = data.nodes.map((node: any) => ({
          data: {
            id: node.id,
            label: node.properties.text || node.properties.name,
            type: node.label,
            deception_score: node.properties.deception_score || 0,
          },
        }));
        const formattedEdges = data.edges.map((edge: any) => ({
          data: { source: edge.source, target: edge.target, label: edge.type },
        }));
        setGraphData({ nodes: formattedNodes, edges: formattedEdges });
      })
      .catch((err) => console.error('Failed to fetch graph data:', err));
  }, []);

  useEffect(() => {
    fetch('/api/agent-actions')
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error('Failed to fetch agent actions:', err));
  }, []);

  const toggleLabel = useMemo(
    () => (neighborhoodMode ? t('app.showFullGraph') : t('app.neighborhoodMode')),
    [neighborhoodMode, t],
  );

  if (!ready) {
    return (
      <div className="App">
        <main className="loading-screen">{t('app.loading')}</main>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="header-tagline">{t('app.tagline')}</p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={() => setNeighborhoodMode((mode) => !mode)} type="button">
            {toggleLabel}
          </button>
          <LanguageSwitcher />
        </div>
      </header>
      <main>
        <div className="intro-grid">
          <LoginPage />
          <IngestWizard />
        </div>
        <Dashboard events={events} graphData={graphData} neighborhoodMode={neighborhoodMode} />
      </main>
    </div>
  );
}

export default App;
