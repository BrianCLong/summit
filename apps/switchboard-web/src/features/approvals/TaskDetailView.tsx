import React from 'react';
import { Approval } from './types';

interface TaskDetailViewProps {
    approval: Approval;
    onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ approval, onClose }) => {
    const payload = approval.payload || {};
    const riskScore = payload.riskScore || 0;
    const diff = payload.diff || {};

    return (
        <div className="task-detail-overlay">
            <div className="task-detail-modal">
                <header>
                    <div className="header-titles">
                        <h3>Task Context</h3>
                        <code className="action-code">{approval.action}</code>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </header>

                <div className="detail-content">
                    <section className="risk-summary">
                        <div className="section-title">Security Analysis</div>
                        <div className="risk-meter">
                            <div className="meter-fill" style={{ width: `${riskScore * 100}%`, backgroundColor: riskScore > 0.7 ? '#ff4d4d' : '#ffcc00' }}></div>
                        </div>
                        <div className="risk-label">
                            UEBA Risk Score: <strong>{(riskScore * 100).toFixed(0)}%</strong>
                        </div>
                        {payload.riskFactors && payload.riskFactors.length > 0 && (
                            <ul className="risk-factors">
                                {payload.riskFactors.map((f: string, i: number) => (
                                    <li key={i} className="risk-factor-item">
                                        <span className="warning-icon">⚠️</span> {f}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="payload-diff">
                        <div className="section-title">Proposed State Changes</div>
                        <div className="diff-container">
                            <pre className="diff-view">
                                {JSON.stringify(diff, null, 2)}
                            </pre>
                        </div>
                    </section>

                    <section className="task-metadata">
                        <div className="section-title">Metadata</div>
                        <div className="metadata-grid">
                            <div className="meta-item">
                                <label>Requester ID</label>
                                <code>{approval.requester_id}</code>
                            </div>
                            <div className="meta-item">
                                <label>Run ID</label>
                                <code>{approval.run_id || 'N/A'}</code>
                            </div>
                            <div className="meta-item">
                                <label>Created At</label>
                                <span>{new Date(approval.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <style>{`
                .task-detail-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.85);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(8px);
                }
                .task-detail-modal {
                    background: #121212;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    width: 700px;
                    max-width: 95vw;
                    max-height: 85vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
                }
                .task-detail-modal header {
                    padding: 1.25rem 1.75rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.02);
                }
                .header-titles h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    color: #fff;
                    font-weight: 600;
                }
                .action-code {
                    font-size: 0.8rem;
                    color: #0078ff;
                    margin-top: 0.25rem;
                    display: block;
                }
                .close-btn {
                    background: transparent;
                    border: none;
                    color: #666;
                    font-size: 1.5rem;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                .close-btn:hover {
                    color: #fff;
                }
                .detail-content {
                    padding: 1.75rem;
                    overflow-y: auto;
                }
                .section-title {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #666;
                    margin-bottom: 1rem;
                    font-weight: 700;
                }
                .risk-summary {
                    margin-bottom: 2.5rem;
                    background: rgba(255, 255, 255, 0.03);
                    padding: 1.25rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .risk-meter {
                    height: 10px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 5px;
                    margin-bottom: 1rem;
                    overflow: hidden;
                }
                .meter-fill {
                    height: 100%;
                    border-radius: 5px;
                    transition: width 1s cubic-bezier(0.17, 0.67, 0.83, 0.67);
                }
                .risk-label {
                    font-size: 1rem;
                    color: #ccc;
                }
                .risk-factors {
                    list-style: none;
                    padding: 0;
                    margin: 1rem 0 0 0;
                }
                .risk-factor-item {
                    font-size: 0.9rem;
                    color: #ff9999;
                    margin-bottom: 0.5rem;
                    padding: 0.5rem;
                    background: rgba(255, 77, 77, 0.05);
                    border-radius: 6px;
                }
                .payload-diff {
                    margin-bottom: 2.5rem;
                }
                .diff-container {
                    background: #000;
                    border-radius: 10px;
                    border: 1px solid rgba(0, 120, 255, 0.1);
                    padding: 1rem;
                }
                .diff-view {
                    margin: 0;
                    font-family: 'Fira Code', monospace;
                    font-size: 0.85rem;
                    line-height: 1.6;
                    color: #79c0ff;
                }
                .metadata-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                .meta-item label {
                    display: block;
                    font-size: 0.7rem;
                    color: #555;
                    margin-bottom: 0.35rem;
                    text-transform: uppercase;
                }
                .meta-item span, .meta-item code {
                    font-size: 0.9rem;
                    color: #aaa;
                }
                .meta-item code {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 2px 6px;
                    border-radius: 4px;
                    color: #888;
                }
            `}</style>
        </div>
    );
};
