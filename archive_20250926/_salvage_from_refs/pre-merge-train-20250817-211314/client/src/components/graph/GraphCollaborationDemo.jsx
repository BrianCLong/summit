import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import {
  People as PeopleIcon,
  Group as GroupIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import AdvancedCollaborativeGraph from './AdvancedCollaborativeGraph';

// Mock data for demonstration
const mockEntities = [
  {
    id: 'person-1',
    type: 'PERSON',
    props: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      department: 'Finance'
    }
  },
  {
    id: 'org-1', 
    type: 'ORGANIZATION',
    props: {
      name: 'TechCorp Inc.',
      industry: 'Technology',
      location: 'San Francisco'
    }
  },
  {
    id: 'event-1',
    type: 'EVENT',
    props: {
      name: 'Board Meeting',
      date: '2025-08-15',
      importance: 'HIGH'
    }
  },
  {
    id: 'location-1',
    type: 'LOCATION', 
    props: {
      name: 'Conference Room A',
      building: 'HQ Building',
      floor: '12th Floor'
    }
  },
  {
    id: 'asset-1',
    type: 'ASSET',
    props: {
      name: 'Financial Report Q3',
      type: 'Document',
      classification: 'Confidential'
    }
  }
];

const mockRelationships = [
  {
    id: 'rel-1',
    from: 'person-1',
    to: 'org-1',
    type: 'EMPLOYED_BY',
    props: { since: '2020-01-15' }
  },
  {
    id: 'rel-2',
    from: 'person-1',
    to: 'event-1',
    type: 'ATTENDED',
    props: { role: 'Presenter' }
  },
  {
    id: 'rel-3',
    from: 'event-1',
    to: 'location-1',
    type: 'HELD_AT',
    props: { duration: '2 hours' }
  },
  {
    id: 'rel-4',
    from: 'person-1',
    to: 'asset-1',
    type: 'CREATED',
    props: { date: '2025-08-10' }
  }
];

const GraphCollaborationDemo = () => {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [comments, setComments] = useState([]);
  
  const handleEntitySelect = (entityId, entityData) => {
    setSelectedEntity({ id: entityId, ...entityData });
    console.log('🎯 Entity selected:', entityId, entityData);
  };

  const handleEntityUpdate = (entityId, changes) => {
    console.log('📝 Entity updated:', entityId, changes);
  };

  const handleAddComment = (entityId, comment) => {
    setComments(prev => [...prev, { entityId, ...comment }]);
    console.log('💬 Comment added:', entityId, comment);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <GroupIcon color="primary" sx={{ fontSize: 32 }} />
          </Grid>
          <Grid item xs>
            <Typography variant="h5" component="h1">
              Real-Time Collaborative Graph Analysis
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Advanced multi-user graph exploration with live collaboration
            </Typography>
          </Grid>
          <Grid item>
            <Chip 
              icon={<PeopleIcon />} 
              label="Live Demo" 
              color="success" 
              variant="outlined"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
        {/* Graph Container */}
        <Box sx={{ flexGrow: 1 }}>
          <AdvancedCollaborativeGraph
            graphId="demo-graph-001"
            entities={mockEntities}
            relationships={mockRelationships}
            onEntitySelect={handleEntitySelect}
            onEntityUpdate={handleEntityUpdate}
            onAddComment={handleAddComment}
          />
        </Box>

        {/* Info Panel */}
        <Box sx={{ width: 300 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔍 Current Analysis
              </Typography>
              
              <Typography variant="body2" paragraph>
                This demo showcases real-time collaborative graph analysis capabilities:
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  📊 Graph Statistics
                </Typography>
                <Chip size="small" label={`${mockEntities.length} Entities`} sx={{ mr: 1, mb: 1 }} />
                <Chip size="small" label={`${mockRelationships.length} Relationships`} sx={{ mr: 1, mb: 1 }} />
                <Chip size="small" label="5 Entity Types" sx={{ mr: 1, mb: 1 }} />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                🚀 Collaboration Features
              </Typography>
              <Box component="ul" sx={{ fontSize: '0.875rem', pl: 2, mb: 2 }}>
                <li>Live cursor tracking</li>
                <li>Real-time entity selection</li>
                <li>Collaborative comments</li>
                <li>Presence indicators</li>
                <li>Multi-user editing</li>
                <li>Activity notifications</li>
              </Box>

              {selectedEntity && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    🎯 Selected Entity
                  </Typography>
                  <Card variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedEntity.type}: {selectedEntity.name || selectedEntity.label}
                    </Typography>
                    <Typography variant="caption" display="block">
                      ID: {selectedEntity.id}
                    </Typography>
                  </Card>
                </>
              )}

              {comments.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    💬 Recent Comments ({comments.length})
                  </Typography>
                  {comments.slice(-3).map((comment, index) => (
                    <Card key={index} variant="outlined" sx={{ p: 1, mb: 1 }}>
                      <Typography variant="caption" display="block">
                        Entity: {comment.entityId}
                      </Typography>
                      <Typography variant="body2">
                        {comment.text}
                      </Typography>
                    </Card>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                🛠️ Quick Actions
              </Typography>
              <Button 
                fullWidth 
                variant="outlined" 
                size="small" 
                sx={{ mb: 1 }}
                onClick={() => window.open('http://localhost:4000/graphql', '_blank')}
              >
                Open GraphQL Playground
              </Button>
              <Button 
                fullWidth 
                variant="outlined" 
                size="small" 
                sx={{ mb: 1 }}
                onClick={() => console.log('🔄 Refreshing graph data...')}
              >
                Refresh Graph Data
              </Button>
              <Button 
                fullWidth 
                variant="outlined" 
                size="small"
                onClick={() => {
                  setSelectedEntity(null);
                  setComments([]);
                }}
              >
                Clear Selection
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default GraphCollaborationDemo;