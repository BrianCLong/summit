import { useTranslation } from 'react-i18next';
import Graph from '../Graph';
import TimelinePanel from '../TimelinePanel';
import { EventItem, GraphData } from '../types';

interface DashboardProps {
  events: EventItem[];
  graphData: GraphData;
  neighborhoodMode: boolean;
}

const Dashboard = ({ events, graphData, neighborhoodMode }: DashboardProps) => {
  const { t } = useTranslation('common');

  return (
    <section aria-labelledby="dashboard-title" className="card dashboard-card">
      <header className="card-header">
        <h2 id="dashboard-title">{t('dashboard.title')}</h2>
        <p className="card-subtitle">{t('dashboard.description')}</p>
      </header>
      <div className="dashboard-grid">
        <div className="graph-wrapper" role="region" aria-label={t('dashboard.title')}>
          <Graph elements={graphData} neighborhoodMode={neighborhoodMode} />
        </div>
        <TimelinePanel events={events} />
      </div>
    </section>
  );
};

export default Dashboard;
