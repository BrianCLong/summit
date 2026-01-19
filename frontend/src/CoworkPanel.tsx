import React, { useState } from 'react';
import './CoworkPanel.css';

interface EventItem {
  id: string;
  action: string;
  confidence: number;
  result: string;
}

interface CoworkPanelProps {
  events: EventItem[];
}

const CoworkPanel: React.FC<CoworkPanelProps> = ({ events }) => {
  const [activeTask, setActiveTask] = useState('task-1');

  // Use props events if available, otherwise fallback to mock data
  const taskEvents: EventItem[] = events.length > 0
    ? events
    : [
        { id: '1', action: 'INIT_RUN', confidence: 1.0, result: 'Run initialized' },
        { id: '2', action: 'PLAN_EXECUTION', confidence: 0.98, result: 'Plan created' },
      ];

  return (
    <div className="cowork-container">
      {/* Left Sidebar: Task List */}
      <div className="cowork-sidebar-left">
        <button className="cowork-new-task-btn">
          <span>+</span> New task
        </button>

        <div
          className={`cowork-task-item ${activeTask === 'task-1' ? 'active' : ''}`}
          onClick={() => setActiveTask('task-1')}
        >
          Review unpublished drafts
        </div>
        <div
          className={`cowork-task-item ${activeTask === 'task-2' ? 'active' : ''}`}
          onClick={() => setActiveTask('task-2')}
        >
           Verify SOC Controls
        </div>
        <div className="cowork-task-item" style={{opacity: 0.6}}>
           Analyze Competitors (Completed)
        </div>
      </div>

      {/* Center: Main Feed */}
      <div className="cowork-main">
        <div className="cowork-header">
          {activeTask === 'task-1' ? 'Review unpublished drafts' : 'Verify SOC Controls'}
        </div>

        <div className="cowork-feed">
          {/* Mock User Request */}
          <div className="cowork-user-msg">
             Look at my drafts that were started within the last three months and check consistency.
          </div>

          {/* Agent Response/Steps */}
          {taskEvents.map((e, idx) => (
            <div key={e.id} className="cowork-agent-step">
              <div className="cowork-step-header">
                <span style={{color: '#28a745'}}>●</span>
                <strong>{e.action}</strong>
                <span style={{marginLeft: 'auto', fontSize: '11px'}}>{idx + 1}/{taskEvents.length}</span>
              </div>
              <div className="cowork-step-content">
                Running command...
              </div>
              <div className="cowork-step-result">
                → {e.result} (Confidence: {e.confidence})
              </div>
            </div>
          ))}

           {/* Input Area (Visual Only) */}
           <div style={{marginTop: 'auto', borderTop: '1px solid #eee', padding: '20px'}}>
             <input
               type="text"
               placeholder="Reply to agent..."
               style={{
                 width: '100%',
                 padding: '12px',
                 borderRadius: '8px',
                 border: '1px solid #ddd',
                 backgroundColor: '#f9f9f9'
                }}
                disabled
              />
           </div>
        </div>
      </div>

      {/* Right Sidebar: Context/Artifacts */}
      <div className="cowork-sidebar-right">
        <div className="cowork-panel-section">
          <div className="cowork-panel-title">Progress</div>
          <div style={{display: 'flex', gap: '5px'}}>
             <div style={{width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #28a745', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#28a745'}}>✓</div>
             <div style={{width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #28a745', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#28a745'}}>✓</div>
             <div style={{width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #ccc'}}></div>
          </div>
          <div style={{fontSize: '12px', color: '#999', marginTop: '8px'}}>Steps will show as task unfolds.</div>
        </div>

        <div className="cowork-panel-section">
          <div className="cowork-panel-title">Artifacts</div>
          <div className="cowork-artifact-item">
             <div className="cowork-artifact-icon" style={{backgroundColor: '#e34c26'}}></div>
             report.html
          </div>
          <div className="cowork-artifact-item">
             <div className="cowork-artifact-icon" style={{backgroundColor: '#f1e05a'}}></div>
             metrics.json
          </div>
        </div>

        <div className="cowork-panel-section">
          <div className="cowork-panel-title">Context</div>
          <div className="cowork-context-tag">📂 blog-drafts</div>
          <div className="cowork-context-tag">🌐 Web search</div>
        </div>

        <div className="cowork-panel-section">
           <div className="cowork-panel-title">Working files</div>
           <div className="cowork-artifact-item">draft-october.md</div>
           <div className="cowork-artifact-item">draft-november.md</div>
        </div>
      </div>
    </div>
  );
};

export default CoworkPanel;
