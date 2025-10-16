import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { gql, useMutation, useQuery, useSubscription } from '@apollo/client';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';

const GET_ENTITY = gql`
  query GetEntity($id: ID!) {
    entity(id: $id) {
      id
      type
      label
      description
      properties
      updatedAt
    }
  }
`;

const UPDATE_ENTITY = gql`
  mutation UpdateEntity(
    $id: ID!
    $input: UpdateEntityInput!
    $lastSeen: DateTime!
  ) {
    updateEntity(id: $id, input: $input, lastSeenTimestamp: $lastSeen) {
      id
      type
      label
      description
      properties
      updatedAt
    }
  }
`;

const ENTITY_UPDATED = gql`
  subscription EntityUpdated {
    entityUpdated {
      id
      type
      label
      description
      properties
      updatedAt
    }
  }
`;

type Entity = {
  id: string;
  type: string;
  label: string;
  description?: string | null;
  properties?: Record<string, any> | null;
  updatedAt?: string;
};

type EntityDrawerProps = {
  entityId: string | null;
  open: boolean;
  onClose: () => void;
};

function DiffRow({
  label,
  oldValue,
  newValue,
}: {
  label: string;
  oldValue?: string;
  newValue?: string;
}) {
  const changed = oldValue !== newValue;
  return (
    <Box display="flex" gap={1} mt={1} alignItems="center">
      <Typography variant="caption" sx={{ width: 80 }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        color={changed ? 'error.main' : 'text.secondary'}
        sx={{ textDecoration: changed ? 'line-through' : 'none' }}
      >
        {oldValue || '<empty>'}
      </Typography>
      <Typography
        variant="caption"
        color={changed ? 'success.main' : 'text.secondary'}
      >
        {newValue || '<empty>'}
      </Typography>
    </Box>
  );
}

export default function EntityDrawer({
  entityId,
  open,
  onClose,
}: EntityDrawerProps) {
  const { data } = useQuery(GET_ENTITY, {
    variables: { id: entityId },
    skip: !entityId,
  });
  const [updateEntity] = useMutation(UPDATE_ENTITY);
  const { data: subData } = useSubscription(ENTITY_UPDATED);

  const [entity, setEntity] = useState<Entity | null>(null);
  const [prevEntity, setPrevEntity] = useState<Entity | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formValues, setFormValues] = useState({ label: '', description: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (data?.entity) {
      setEntity(data.entity);
      setFormValues({
        label: data.entity.label,
        description: data.entity.description || '',
      });
      setTags(data.entity.properties?.tags || []);
    }
  }, [data]);

  useEffect(() => {
    const updated = subData?.entityUpdated;
    if (updated && updated.id === entityId) {
      setPrevEntity(entity || null);
      setEntity(updated);
      setFormValues({
        label: updated.label,
        description: updated.description || '',
      });
      setTags(updated.properties?.tags || []);
    }
  }, [subData, entityId, entity]);

  const handleSave = async () => {
    if (!entityId) return;
    const input = {
      label: formValues.label,
      description: formValues.description,
      properties: { ...entity?.properties, tags },
    };
    await updateEntity({
      variables: { id: entityId, input, lastSeen: new Date().toISOString() },
    });
  };

  const handleBlur = () => {
    if (editMode) handleSave();
  };

  const handleTagAdd = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setNewTag('');
    }
  };

  const handleTagDelete = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const diffSection = prevEntity && (
    <Box mt={2}>
      <Typography variant="subtitle2">Last Update Diff</Typography>
      <DiffRow
        label="Label"
        oldValue={prevEntity.label}
        newValue={entity?.label}
      />
      <DiffRow
        label="Description"
        oldValue={prevEntity.description || ''}
        newValue={entity?.description || ''}
      />
      <DiffRow
        label="Tags"
        oldValue={(prevEntity.properties?.tags || []).join(', ')}
        newValue={tags.join(', ')}
      />
    </Box>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: 400, p: 2 } }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Entity Details</Typography>
        <Box>
          <IconButton
            onClick={() => setEditMode((m) => !m)}
            size="small"
            sx={{ mr: 1 }}
          >
            <EditIcon />
          </IconButton>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>
      <Stack spacing={2}>
        <TextField
          label="Label"
          value={formValues.label}
          onChange={(e) =>
            setFormValues({ ...formValues, label: e.target.value })
          }
          onBlur={handleBlur}
          disabled={!editMode}
          fullWidth
        />
        <TextField
          label="Description"
          value={formValues.description}
          multiline
          minRows={3}
          onChange={(e) =>
            setFormValues({ ...formValues, description: e.target.value })
          }
          onBlur={handleBlur}
          disabled={!editMode}
          fullWidth
        />
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Metadata Tags
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            onBlur={handleBlur}
          >
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={editMode ? () => handleTagDelete(tag) : undefined}
                sx={{ mb: 1 }}
              />
            ))}
            {editMode && (
              <TextField
                size="small"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTagAdd();
                  }
                }}
              />
            )}
          </Stack>
        </Box>
        {editMode && (
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ alignSelf: 'flex-start' }}
          >
            Save
          </Button>
        )}
        {diffSection}
      </Stack>
    </Drawer>
  );
}
