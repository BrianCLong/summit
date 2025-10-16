import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';

const GET_INVESTIGATIONS = gql`
  query GetInvestigations(
    $filter: InvestigationFilter
    $sort: InvestigationSort
    $limit: Int
  ) {
    investigations(filter: $filter, sort: $sort, limit: $limit) {
      id
      name
      description
      status
      priority
      createdBy
      assignedTo
      createdAt
      updatedAt
      entityCount
      relationshipCount
      tags
      metadata
    }
  }
`;

const CREATE_INVESTIGATION = gql`
  mutation CreateInvestigation($input: CreateInvestigationInput!) {
    createInvestigation(input: $input) {
      id
      name
      status
      createdAt
    }
  }
`;

const UPDATE_INVESTIGATION = gql`
  mutation UpdateInvestigation($id: ID!, $input: UpdateInvestigationInput!) {
    updateInvestigation(id: $id, input: $input) {
      id
      name
      status
      updatedAt
    }
  }
`;

interface Investigation {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'closed' | 'archived' | 'draft';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  entityCount?: number;
  relationshipCount?: number;
  tags?: string[];
  metadata?: any;
}

interface InvestigationManagerProps {
  onInvestigationSelect?: (investigation: Investigation) => void;
  currentInvestigationId?: string;
}

function InvestigationManager({
  onInvestigationSelect,
  currentInvestigationId,
}: InvestigationManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingInvestigation, setEditingInvestigation] =
    useState<Investigation | null>(null);
  const [filter, setFilter] = useState<any>({
    status: '',
    priority: '',
    assignedTo: '',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, loading, error, refetch } = useQuery(GET_INVESTIGATIONS, {
    variables: {
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sort: { field: 'updatedAt', direction: 'DESC' },
      limit: 50,
    },
    errorPolicy: 'all',
  });

  const [createInvestigation, { loading: createLoading }] =
    useMutation(CREATE_INVESTIGATION);
  const [updateInvestigation, { loading: updateLoading }] =
    useMutation(UPDATE_INVESTIGATION);

  const investigations = data?.investigations || [];

  const handleCreateInvestigation = async (formData: any) => {
    try {
      const result = await createInvestigation({
        variables: {
          input: {
            name: formData.name,
            description: formData.description,
            priority: formData.priority || 'medium',
            tags:
              formData.tags
                ?.split(',')
                .map((tag: string) => tag.trim())
                .filter(Boolean) || [],
          },
        },
      });

      if (result.data?.createInvestigation) {
        setShowCreateForm(false);
        refetch();
        onInvestigationSelect?.(result.data.createInvestigation);
      }
    } catch (error) {
      console.error('Failed to create investigation:', error);
    }
  };

  const handleUpdateInvestigation = async (id: string, formData: any) => {
    try {
      await updateInvestigation({
        variables: {
          id,
          input: {
            name: formData.name,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            assignedTo: formData.assignedTo,
            tags:
              formData.tags
                ?.split(',')
                .map((tag: string) => tag.trim())
                .filter(Boolean) || [],
          },
        },
      });

      setEditingInvestigation(null);
      refetch();
    } catch (error) {
      console.error('Failed to update investigation:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#059669';
      case 'draft':
        return '#d97706';
      case 'closed':
        return '#6b7280';
      case 'archived':
        return '#9ca3af';
      default:
        return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#d97706';
      case 'low':
        return '#059669';
      default:
        return '#6b7280';
    }
  };

  const InvestigationForm = ({ investigation, onSubmit, onCancel }: any) => {
    const [formData, setFormData] = useState({
      name: investigation?.name || '',
      description: investigation?.description || '',
      status: investigation?.status || 'draft',
      priority: investigation?.priority || 'medium',
      assignedTo: investigation?.assignedTo || '',
      tags: investigation?.tags?.join(', ') || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <div className="panel" style={{ padding: '24px', marginBottom: '20px' }}>
        <h3
          style={{
            fontSize: '1.2rem',
            fontWeight: '600',
            marginBottom: '20px',
          }}
        >
          {investigation ? '✏️ Edit Investigation' : '➕ New Investigation'}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label
              style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '6px',
                display: 'block',
              }}
            >
              Investigation Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                fontSize: '14px',
              }}
              placeholder="Enter investigation name..."
            />
          </div>

          <div>
            <label
              style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '6px',
                display: 'block',
              }}
            >
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical',
              }}
              placeholder="Describe the investigation objective and scope..."
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
            }}
          >
            {investigation && (
              <div>
                <label
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '6px',
                    display: 'block',
                  }}
                >
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--hairline)',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}

            <div>
              <label
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  display: 'block',
                }}
              >
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, priority: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--hairline)',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {investigation && (
              <div>
                <label
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '6px',
                    display: 'block',
                  }}
                >
                  Assigned To
                </label>
                <input
                  type="text"
                  value={formData.assignedTo}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      assignedTo: e.target.value,
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--hairline)',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  placeholder="analyst@example.com"
                />
              </div>
            )}
          </div>

          <div>
            <label
              style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '6px',
                display: 'block',
              }}
            >
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, tags: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                fontSize: '14px',
              }}
              placeholder="cybersecurity, financial, APT, malware..."
            />
          </div>

          <div
            style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading || updateLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1a73e8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                minWidth: '100px',
              }}
            >
              {createLoading || updateLoading
                ? '⏳ Saving...'
                : investigation
                  ? 'Update'
                  : 'Create'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
          🔍 Investigation Manager
        </h2>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              border: '1px solid var(--hairline)',
              borderRadius: '4px',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px',
                backgroundColor:
                  viewMode === 'grid' ? '#1a73e8' : 'transparent',
                color: viewMode === 'grid' ? 'white' : '#666',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 12px',
                backgroundColor:
                  viewMode === 'list' ? '#1a73e8' : 'transparent',
                color: viewMode === 'list' ? 'white' : '#666',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ☰ List
            </button>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ➕ New Investigation
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <label
              style={{
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '4px',
                display: 'block',
              }}
            >
              Status
            </label>
            <select
              value={filter.status}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, status: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '4px',
                display: 'block',
              }}
            >
              Priority
            </label>
            <select
              value={filter.priority}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, priority: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '4px',
                display: 'block',
              }}
            >
              Assigned To
            </label>
            <input
              type="text"
              value={filter.assignedTo}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, assignedTo: e.target.value }))
              }
              placeholder="Filter by assignee..."
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <InvestigationForm
          onSubmit={handleCreateInvestigation}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Form */}
      {editingInvestigation && (
        <InvestigationForm
          investigation={editingInvestigation}
          onSubmit={(formData: any) =>
            handleUpdateInvestigation(editingInvestigation.id, formData)
          }
          onCancel={() => setEditingInvestigation(null)}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>⏳ Loading investigations...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          className="panel"
          style={{
            padding: '20px',
            backgroundColor: '#fef2f2',
            borderColor: '#fecaca',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#dc2626', marginBottom: '8px' }}>
            ❌ Failed to load investigations
          </div>
          <div style={{ fontSize: '14px', color: '#7f1d1d' }}>
            {error.message}
          </div>
          <button
            onClick={() => refetch()}
            style={{
              marginTop: '12px',
              padding: '6px 12px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {/* Investigations Grid/List */}
      {!loading && !error && (
        <div>
          {investigations.length === 0 ? (
            <div
              className="panel"
              style={{
                padding: '40px',
                textAlign: 'center',
                backgroundColor: '#f8f9fa',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}
              >
                No investigations found
              </h3>
              <p style={{ color: '#666', marginBottom: '16px' }}>
                Create your first investigation to start organizing your
                intelligence analysis work.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#1a73e8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ➕ Create Investigation
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  viewMode === 'grid'
                    ? 'repeat(auto-fill, minmax(350px, 1fr))'
                    : '1fr',
                gap: '16px',
              }}
            >
              {investigations.map((investigation: Investigation) => (
                <div
                  key={investigation.id}
                  className="panel"
                  style={{
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border:
                      currentInvestigationId === investigation.id
                        ? '2px solid #1a73e8'
                        : '1px solid var(--hairline)',
                  }}
                  onClick={() => onInvestigationSelect?.(investigation)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        margin: 0,
                        color:
                          currentInvestigationId === investigation.id
                            ? '#1a73e8'
                            : 'inherit',
                      }}
                    >
                      {investigation.name}
                    </h3>

                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor:
                            getStatusColor(investigation.status) + '20',
                          color: getStatusColor(investigation.status),
                          textTransform: 'uppercase',
                          fontWeight: '600',
                        }}
                      >
                        {investigation.status}
                      </span>

                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor:
                            getPriorityColor(investigation.priority) + '20',
                          color: getPriorityColor(investigation.priority),
                          textTransform: 'uppercase',
                          fontWeight: '600',
                        }}
                      >
                        {investigation.priority}
                      </span>
                    </div>
                  </div>

                  {investigation.description && (
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '12px',
                        lineHeight: 1.4,
                      }}
                    >
                      {investigation.description.length > 120
                        ? `${investigation.description.substring(0, 120)}...`
                        : investigation.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(100px, 1fr))',
                      gap: '12px',
                      marginBottom: '12px',
                      fontSize: '12px',
                      color: '#666',
                    }}
                  >
                    <div>
                      <strong>Entities:</strong>{' '}
                      {investigation.entityCount || 0}
                    </div>
                    <div>
                      <strong>Relations:</strong>{' '}
                      {investigation.relationshipCount || 0}
                    </div>
                    <div>
                      <strong>Created:</strong>{' '}
                      {new Date(investigation.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Updated:</strong>{' '}
                      {new Date(investigation.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {investigation.tags && investigation.tags.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      {investigation.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            marginRight: '4px',
                            backgroundColor: '#e5e7eb',
                            color: '#4b5563',
                            borderRadius: '3px',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {investigation.tags.length > 3 && (
                        <span style={{ fontSize: '10px', color: '#999' }}>
                          +{investigation.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {investigation.createdBy &&
                        `by ${investigation.createdBy}`}
                      {investigation.assignedTo &&
                        ` • assigned to ${investigation.assignedTo}`}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingInvestigation(investigation);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--hairline)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: '#666',
                      }}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InvestigationManager;
