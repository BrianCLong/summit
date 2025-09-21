import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  loss: number;
  latency: number;
  throughput: number;
  errorRate: number;
}

interface ModelVersion {
  id: string;
  version: string;
  name: string;
  description: string;
  algorithm: string;
  status: 'development' | 'staging' | 'production' | 'deprecated' | 'failed';
  createdAt: Date;
  deployedAt?: Date;
  author: string;
  metrics: ModelMetrics;
  tags: string[];
  datasetVersion: string;
  trainingDuration: number;
  modelSize: number; // MB
  environment: {
    python: string;
    frameworks: { [key: string]: string };
    hardware: string;
  };
  endpoints: {
    training?: string;
    inference?: string;
    monitoring?: string;
  };
  isActive: boolean;
  parentModel?: string;
  experiments: string[];
}

interface TrainingJob {
  id: string;
  modelId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: Date;
  endTime?: Date;
  parameters: { [key: string]: any };
  metrics: Partial<ModelMetrics>;
  logs: string[];
  artifacts: string[];
  resource_usage: {
    gpu: number;
    cpu: number;
    memory: number;
    storage: number;
  };
}

interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  models: string[];
  baselineModel: string;
  objective: string;
  metrics: string[];
  startDate: Date;
  endDate?: Date;
  tags: string[];
  results: {
    bestModel: string;
    improvement: number;
    insights: string[];
  };
}

interface ModelManagementDashboardProps {
  investigationId?: string;
  onModelSelect?: (model: ModelVersion) => void;
  onDeployModel?: (modelId: string, environment: string) => void;
  onExperimentSelect?: (experiment: Experiment) => void;
  className?: string;
}

const ModelManagementDashboard: React.FC<ModelManagementDashboardProps> = ({
  investigationId,
  onModelSelect,
  onDeployModel,
  onExperimentSelect,
  className = ''
}) => {
  const [activeView, setActiveView] = useState<'models' | 'training' | 'experiments' | 'monitoring'>('models');
  const [selectedModel, setSelectedModel] = useState<ModelVersion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  const mockModels: ModelVersion[] = useMemo(() => [
    {
      id: 'model-001',
      version: 'v2.3.1',
      name: 'Entity Resolution Neural Network',
      description: 'Deep learning model for entity resolution and deduplication',
      algorithm: 'Siamese Neural Network',
      status: 'production',
      createdAt: new Date(2024, 0, 15),
      deployedAt: new Date(2024, 0, 20),
      author: 'Dr. Sarah Chen',
      metrics: {
        accuracy: 94.2,
        precision: 92.8,
        recall: 95.6,
        f1Score: 94.2,
        auc: 97.3,
        loss: 0.084,
        latency: 12.5,
        throughput: 1847,
        errorRate: 0.02
      },
      tags: ['entity-resolution', 'neural-network', 'production'],
      datasetVersion: 'v1.2.0',
      trainingDuration: 180,
      modelSize: 45.3,
      environment: {
        python: '3.9.7',
        frameworks: { tensorflow: '2.8.0', numpy: '1.21.0', pandas: '1.3.3' },
        hardware: 'NVIDIA V100'
      },
      endpoints: {
        inference: '/api/models/entity-resolution/predict',
        monitoring: '/api/models/entity-resolution/metrics'
      },
      isActive: true,
      experiments: ['exp-001', 'exp-002']
    },
    {
      id: 'model-002',
      version: 'v1.8.4',
      name: 'Anomaly Detection Ensemble',
      description: 'Ensemble model for detecting anomalous patterns in intelligence data',
      algorithm: 'Random Forest + Isolation Forest',
      status: 'staging',
      createdAt: new Date(2024, 0, 10),
      author: 'Alex Rodriguez',
      metrics: {
        accuracy: 89.7,
        precision: 87.3,
        recall: 92.1,
        f1Score: 89.6,
        auc: 94.8,
        loss: 0.112,
        latency: 8.2,
        throughput: 2341,
        errorRate: 0.03
      },
      tags: ['anomaly-detection', 'ensemble', 'staging'],
      datasetVersion: 'v1.1.2',
      trainingDuration: 95,
      modelSize: 23.7,
      environment: {
        python: '3.9.7',
        frameworks: { sklearn: '1.0.2', xgboost: '1.5.1', pandas: '1.3.3' },
        hardware: 'CPU Cluster'
      },
      endpoints: {
        inference: '/api/models/anomaly-detection/predict'
      },
      isActive: true,
      parentModel: 'model-001',
      experiments: ['exp-003']
    },
    {
      id: 'model-003',
      version: 'v3.1.0-beta',
      name: 'Sentiment Analysis Transformer',
      description: 'BERT-based model for sentiment analysis of intelligence reports',
      algorithm: 'BERT Transformer',
      status: 'development',
      createdAt: new Date(2024, 0, 25),
      author: 'Dr. Michael Zhang',
      metrics: {
        accuracy: 87.1,
        precision: 85.9,
        recall: 88.4,
        f1Score: 87.1,
        auc: 91.2,
        loss: 0.156,
        latency: 45.3,
        throughput: 234,
        errorRate: 0.05
      },
      tags: ['sentiment-analysis', 'transformer', 'nlp', 'development'],
      datasetVersion: 'v2.0.0-rc1',
      trainingDuration: 720,
      modelSize: 342.1,
      environment: {
        python: '3.10.2',
        frameworks: { transformers: '4.18.0', pytorch: '1.11.0', tokenizers: '0.12.1' },
        hardware: 'NVIDIA A100'
      },
      isActive: false,
      experiments: ['exp-004']
    }
  ], []);

  const mockTrainingJobs: TrainingJob[] = useMemo(() => [
    {
      id: 'job-001',
      modelId: 'model-003',
      status: 'running',
      progress: 67,
      startTime: new Date(Date.now() - 7200000), // 2 hours ago
      parameters: {
        learning_rate: 0.001,
        batch_size: 32,
        epochs: 50,
        dropout: 0.2,
        optimizer: 'AdamW'
      },
      metrics: {
        accuracy: 85.3,
        loss: 0.178
      },
      logs: [
        'Epoch 33/50 - loss: 0.178 - accuracy: 0.853 - val_loss: 0.192 - val_accuracy: 0.841',
        'Learning rate reduced on plateau: 0.001 -> 0.0005',
        'Early stopping patience: 5/10'
      ],
      artifacts: ['model_checkpoint_epoch_33.pth', 'training_history.json'],
      resource_usage: {
        gpu: 87,
        cpu: 34,
        memory: 78,
        storage: 12
      }
    },
    {
      id: 'job-002',
      modelId: 'model-002',
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 86400000), // 1 day ago
      endTime: new Date(Date.now() - 82800000), // 23 hours ago
      parameters: {
        n_estimators: 100,
        max_depth: 15,
        contamination: 0.1
      },
      metrics: {
        accuracy: 89.7,
        precision: 87.3,
        recall: 92.1,
        f1Score: 89.6
      },
      logs: [
        'Training completed successfully',
        'Model validation passed',
        'Artifacts saved to model registry'
      ],
      artifacts: ['model_v1.8.4.pkl', 'feature_importance.json', 'validation_report.html'],
      resource_usage: {
        gpu: 0,
        cpu: 65,
        memory: 45,
        storage: 8
      }
    }
  ], []);

  const mockExperiments: Experiment[] = useMemo(() => [
    {
      id: 'exp-001',
      name: 'Entity Resolution Optimization',
      description: 'A/B testing different neural network architectures for entity resolution',
      status: 'completed',
      models: ['model-001', 'model-002'],
      baselineModel: 'model-baseline-001',
      objective: 'Maximize F1 Score while maintaining inference latency < 15ms',
      metrics: ['f1Score', 'latency', 'accuracy'],
      startDate: new Date(2024, 0, 1),
      endDate: new Date(2024, 0, 20),
      tags: ['entity-resolution', 'optimization', 'a-b-test'],
      results: {
        bestModel: 'model-001',
        improvement: 12.3,
        insights: [
          'Siamese architecture outperformed triplet loss by 8.2% F1',
          'Batch normalization crucial for convergence speed',
          'Data augmentation improved generalization by 15%'
        ]
      }
    }
  ], []);

  // Filtered data
  const filteredModels = useMemo(() => {
    return mockModels.filter(model => {
      const matchesSearch = searchQuery === '' || 
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = filterStatus === 'all' || model.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [mockModels, searchQuery, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'production': return '#28a745';
      case 'staging': return '#ffc107';
      case 'development': return '#17a2b8';
      case 'deprecated': return '#6c757d';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'production': return '🟢';
      case 'staging': return '🟡';
      case 'development': return '🔵';
      case 'deprecated': return '⚫';
      case 'failed': return '🔴';
      default: return '⚪';
    }
  };

  const handleModelSelect = useCallback((model: ModelVersion) => {
    setSelectedModel(model);
    onModelSelect?.(model);
  }, [onModelSelect]);

  const handleDeploy = useCallback((modelId: string, environment: string) => {
    onDeployModel?.(modelId, environment);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  }, [onDeployModel]);

  return (
    <div className={`model-management-dashboard ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '16px' }}>
          🤖 MLOps Model Management
        </h3>

        {/* View Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--hairline)', marginBottom: '16px' }}>
          {[
            { key: 'models', label: '🎯 Models', count: filteredModels.length },
            { key: 'training', label: '🏋️ Training Jobs', count: mockTrainingJobs.length },
            { key: 'experiments', label: '🧪 Experiments', count: mockExperiments.length },
            { key: 'monitoring', label: '📊 Monitoring', count: 0 }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              style={{
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeView === tab.key ? '2px solid #1a73e8' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeView === tab.key ? '600' : '400',
                color: activeView === tab.key ? '#1a73e8' : '#666'
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search models, tags, or algorithms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--hairline)',
              borderRadius: '4px',
              flex: '1 1 300px',
              fontSize: '14px'
            }}
          />
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px', border: '1px solid var(--hairline)', borderRadius: '4px', fontSize: '14px' }}
          >
            <option value="all">All Status</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeView === 'models' && (
          <div style={{ height: '100%', display: 'grid', gridTemplateColumns: selectedModel ? '1fr 1fr' : '1fr', gap: '16px' }}>
            {/* Models List */}
            <div style={{ overflow: 'auto', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--hairline)', backgroundColor: '#f8f9fa' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  ML Models ({filteredModels.length})
                </h4>
              </div>
              
              <div>
                {filteredModels.map(model => (
                  <div
                    key={model.id}
                    onClick={() => handleModelSelect(model)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      backgroundColor: selectedModel?.id === model.id ? '#e3f2fd' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedModel?.id !== model.id) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedModel?.id !== model.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                          {model.name}
                        </h5>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {model.version} • {model.algorithm}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{getStatusIcon(model.status)}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            backgroundColor: getStatusColor(model.status),
                            color: 'white',
                            fontWeight: '600'
                          }}
                        >
                          {model.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px', fontSize: '12px' }}>
                      <div><strong>Accuracy:</strong> {model.metrics.accuracy}%</div>
                      <div><strong>F1:</strong> {model.metrics.f1Score}%</div>
                      <div><strong>Latency:</strong> {model.metrics.latency}ms</div>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                      {model.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '12px',
                            color: '#495057'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <div>Author: {model.author}</div>
                      <div>Created: {model.createdAt.toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Details */}
            {selectedModel && (
              <div style={{ overflow: 'auto', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--hairline)', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                    Model Details
                  </h4>
                  
                  {selectedModel.status !== 'production' && (
                    <button
                      onClick={() => handleDeploy(selectedModel.id, 'production')}
                      disabled={isLoading}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1
                      }}
                    >
                      {isLoading ? 'Deploying...' : '🚀 Deploy'}
                    </button>
                  )}
                </div>
                
                <div style={{ padding: '16px' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <h5 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                      {selectedModel.name} {selectedModel.version}
                    </h5>
                    <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                      {selectedModel.description}
                    </p>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Performance Metrics</h6>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                      <div><strong>Accuracy:</strong> {selectedModel.metrics.accuracy}%</div>
                      <div><strong>Precision:</strong> {selectedModel.metrics.precision}%</div>
                      <div><strong>Recall:</strong> {selectedModel.metrics.recall}%</div>
                      <div><strong>F1 Score:</strong> {selectedModel.metrics.f1Score}%</div>
                      <div><strong>AUC:</strong> {selectedModel.metrics.auc}%</div>
                      <div><strong>Loss:</strong> {selectedModel.metrics.loss}</div>
                      <div><strong>Latency:</strong> {selectedModel.metrics.latency}ms</div>
                      <div><strong>Throughput:</strong> {selectedModel.metrics.throughput}/sec</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Model Information</h6>
                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      <div><strong>Algorithm:</strong> {selectedModel.algorithm}</div>
                      <div><strong>Size:</strong> {selectedModel.modelSize} MB</div>
                      <div><strong>Training Duration:</strong> {selectedModel.trainingDuration} minutes</div>
                      <div><strong>Dataset Version:</strong> {selectedModel.datasetVersion}</div>
                      <div><strong>Author:</strong> {selectedModel.author}</div>
                      <div><strong>Created:</strong> {selectedModel.createdAt.toLocaleString()}</div>
                      {selectedModel.deployedAt && (
                        <div><strong>Deployed:</strong> {selectedModel.deployedAt.toLocaleString()}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Environment</h6>
                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      <div><strong>Python:</strong> {selectedModel.environment.python}</div>
                      <div><strong>Hardware:</strong> {selectedModel.environment.hardware}</div>
                      <div><strong>Frameworks:</strong></div>
                      <div style={{ marginLeft: '16px' }}>
                        {Object.entries(selectedModel.environment.frameworks).map(([name, version]) => (
                          <div key={name}>• {name}: {version}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {selectedModel.endpoints && (
                    <div style={{ marginBottom: '24px' }}>
                      <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Endpoints</h6>
                      <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                        {selectedModel.endpoints.inference && (
                          <div><strong>Inference:</strong> <code>{selectedModel.endpoints.inference}</code></div>
                        )}
                        {selectedModel.endpoints.monitoring && (
                          <div><strong>Monitoring:</strong> <code>{selectedModel.endpoints.monitoring}</code></div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '24px' }}>
                    <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Tags</h6>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {selectedModel.tags.map(tag => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '12px',
                            color: '#495057'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'training' && (
          <div style={{ overflow: 'auto', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--hairline)', backgroundColor: '#f8f9fa' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                Training Jobs ({mockTrainingJobs.length})
              </h4>
            </div>
            
            <div>
              {mockTrainingJobs.map(job => (
                <div
                  key={job.id}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                        Training Job {job.id}
                      </h5>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Model: {job.modelId} • Started: {job.startTime.toLocaleString()}
                      </div>
                    </div>
                    
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        backgroundColor: job.status === 'completed' ? '#28a745' : 
                                        job.status === 'running' ? '#17a2b8' :
                                        job.status === 'failed' ? '#dc3545' : '#ffc107',
                        color: 'white',
                        fontWeight: '600'
                      }}
                    >
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {job.status === 'running' && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span>Progress</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div style={{ 
                        width: '100%', 
                        height: '4px', 
                        backgroundColor: '#e9ecef', 
                        borderRadius: '2px' 
                      }}>
                        <div 
                          style={{ 
                            width: `${job.progress}%`, 
                            height: '100%', 
                            backgroundColor: '#17a2b8', 
                            borderRadius: '2px',
                            transition: 'width 0.3s ease'
                          }} 
                        />
                      </div>
                    </div>
                  )}
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px', fontSize: '12px' }}>
                    <div><strong>GPU:</strong> {job.resource_usage.gpu}%</div>
                    <div><strong>CPU:</strong> {job.resource_usage.cpu}%</div>
                    <div><strong>Memory:</strong> {job.resource_usage.memory}%</div>
                    <div><strong>Storage:</strong> {job.resource_usage.storage} GB</div>
                  </div>
                  
                  {job.metrics.accuracy && (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      Current Metrics: Accuracy {job.metrics.accuracy}% • Loss {job.metrics.loss}
                    </div>
                  )}
                  
                  <details style={{ fontSize: '12px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '600' }}>View Logs</summary>
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      {job.logs.map((log, index) => (
                        <div key={index} style={{ fontFamily: 'monospace', fontSize: '11px', marginBottom: '2px' }}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'experiments' && (
          <div style={{ padding: '16px', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              ML Experiments
            </h4>
            
            {mockExperiments.map(experiment => (
              <div
                key={experiment.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => onExperimentSelect?.(experiment)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                    {experiment.name}
                  </h5>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '12px',
                      backgroundColor: experiment.status === 'completed' ? '#28a745' : '#17a2b8',
                      color: 'white'
                    }}
                  >
                    {experiment.status.toUpperCase()}
                  </span>
                </div>
                
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px', lineHeight: '1.4' }}>
                  {experiment.description}
                </p>
                
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                  <strong>Objective:</strong> {experiment.objective}
                </div>
                
                {experiment.status === 'completed' && experiment.results && (
                  <div style={{ fontSize: '12px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <div><strong>Best Model:</strong> {experiment.results.bestModel}</div>
                    <div><strong>Improvement:</strong> +{experiment.results.improvement}%</div>
                    <div><strong>Key Insights:</strong></div>
                    <ul style={{ marginLeft: '16px', marginTop: '4px' }}>
                      {experiment.results.insights.map((insight, index) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  <div>Duration: {experiment.startDate.toLocaleDateString()} - {experiment.endDate?.toLocaleDateString()}</div>
                  <div>Models: {experiment.models.length}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeView === 'monitoring' && (
          <div style={{ padding: '16px', border: '1px solid var(--hairline)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ padding: '40px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                📊 Model Monitoring Dashboard
              </h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                Real-time monitoring of model performance, drift detection, and system health metrics.
              </p>
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '13px', color: '#666' }}>
                🚧 Monitoring dashboard coming soon - will include:
                <ul style={{ textAlign: 'left', marginTop: '12px', marginLeft: '20px' }}>
                  <li>Real-time performance metrics</li>
                  <li>Data drift detection</li>
                  <li>Model degradation alerts</li>
                  <li>Resource utilization tracking</li>
                  <li>A/B testing results</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelManagementDashboard;