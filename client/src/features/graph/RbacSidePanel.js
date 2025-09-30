import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { rbacSchema } from './rbac-schema';

cytoscape.use(dagre);

const OVER_PERMISSION_THRESHOLD = 15;

const RbacSidePanel = () => {
  const cyRef = useRef(null);

  useEffect(() => {
    const elements = [];

    rbacSchema.users.forEach((user) => {
      elements.push({ data: { id: user.id, label: user.id, type: 'user' } });
      user.roles.forEach((roleId) => {
        elements.push({
          data: { id: `${user.id}-${roleId}`, source: user.id, target: roleId },
        });
      });
    });

    rbacSchema.roles.forEach((role) => {
      const overPermissive = role.permissions.length > OVER_PERMISSION_THRESHOLD;
      elements.push({
        data: { id: role.id, label: role.id, type: 'role', overPermissive },
      });
      role.entities.forEach((entityId) => {
        elements.push({
          data: {
            id: `${role.id}-${entityId}`,
            source: role.id,
            target: entityId,
          },
        });
      });
    });

    rbacSchema.entities.forEach((entity) => {
      elements.push({
        data: { id: entity.id, label: entity.id, type: 'entity' },
      });
    });

    cyRef.current = cytoscape({
      container: document.getElementById('rbac-cy'),
      elements,
      style: [
        {
          selector: 'node[type="user"]',
          style: {
            'background-color': '#1976d2',
            label: 'data(label)',
            color: '#fff',
          },
        },
        {
          selector: 'node[type="role"]',
          style: {
            'background-color': '#0288d1',
            label: 'data(label)',
            color: '#fff',
          },
        },
        {
          selector: 'node[overPermissive = "true"]',
          style: { 'background-color': '#d32f2f' },
        },
        {
          selector: 'node[type="entity"]',
          style: {
            'background-color': '#388e3c',
            label: 'data(label)',
            color: '#fff',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
          },
        },
      ],
      layout: { name: 'dagre', rankDir: 'LR' },
    });

    return () => {
      cyRef.current && cyRef.current.destroy();
    };
  }, []);

  return (
    <Box sx={{ width: 300, borderLeft: '1px solid #eee', p: 1, height: '100%' }}>
      <Typography variant="subtitle1" gutterBottom>
        RBAC Graph
      </Typography>
      <Box id="rbac-cy" sx={{ height: '100%' }} />
    </Box>
  );
};

export default RbacSidePanel;
