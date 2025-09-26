import { useTranslation } from 'react-i18next';
import { EventItem } from './types';

interface TimelinePanelProps {
  events: EventItem[];
}

const TimelinePanel = ({ events }: TimelinePanelProps) => {
  const { t } = useTranslation('common');

  return (
    <aside aria-labelledby="timeline-title" className="timeline-panel">
      <h3 id="timeline-title">{t('dashboard.timeline.title')}</h3>
      {events.length === 0 ? (
        <p className="timeline-empty">{t('dashboard.timeline.empty')}</p>
      ) : (
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <strong>{event.action}</strong> ({event.confidence}) – {event.result}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};

export default TimelinePanel;
