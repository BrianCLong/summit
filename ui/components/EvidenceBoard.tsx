import React, { useState, useEffect, useCallback } from 'react';
import {
  Card as MuiCard,
  CardContent,
  CardHeader,
  CardActions,
  Button,
  TextField,
  Chip,
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  InputAdornment,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  FormControlLabel,
  Switch,
  Autocomplete,
  Stack,
  Alert,
  Checkbox,
  ListItemIcon
} from '@mui/material';
import { 
  Add as AddIcon, 
  FilterList as FilterListIcon, 
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  DragIndicator as DragIndicatorIcon,
  Tag as TagIcon,
  Category as CategoryIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAccessibility } from '../../design-system/src/accessibility/AccessibilityContext';
import { v4 as uuidv4 } from 'uuid';
import { styled } from '@mui/material/styles';

// Types
export interface EvidenceTag {
  id: string;
  name: string;
  color: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  description: string;
  tags: string[]; // IDs of tags
  columnId: string;
  createdAt: Date;
  updatedAt: Date;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
  confidence?: number; // 0-100
  status?: string;
}

export interface EvidenceColumn {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  color: string;
}

export interface EvidenceBoardProps {
  initialColumns?: EvidenceColumn[];
  initialItems?: EvidenceItem[];
  initialTags?: EvidenceTag[];
  onItemsChange?: (items: EvidenceItem[]) => void;
  onColumnsChange?: (columns: EvidenceColumn[]) => void;
  onTagsChange?: (tags: EvidenceTag[]) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Styled components
const BoardContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(2),
}));

const ColumnsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  overflowX: 'auto',
  padding: theme.spacing(1, 0),
  height: 'calc(100% - 64px)', // Account for header
}));

const ColumnContainer = styled(Box)(({ theme }) => ({
  minWidth: 300,
  maxWidth: 350,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
}));

const ColumnHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: theme.palette.grey[50],
  borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
}));

const ItemsContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  overflowY: 'auto',
  flex: 1,
  minHeight: 0,
}));

const EvidenceCard = styled(MuiCard)(({ theme }) => ({
  margin: theme.spacing(1),
  transition: 'box-shadow 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
  cursor: 'grab',
  '&:active': {
    cursor: 'grabbing',
  },
}));

// Drag and Drop Context
interface DragContext {
  type: 'evidence' | 'column';
  id: string;
  columnId?: string;
}

// Default data
const DEFAULT_COLUMNS: EvidenceColumn[] = [
  { id: 'new', title: 'New Evidence', description: 'Recently discovered items', itemCount: 0, color: '#667eea' },
  { id: 'analyzing', title: 'In Analysis', description: 'Currently being examined', itemCount: 0, color: '#667eea' },
  { id: 'verified', title: 'Verified', description: 'Confirmed and validated', itemCount: 0, color: '#28a745' },
  { id: 'rejected', title: 'Rejected', description: 'Discredited or invalid', itemCount: 0, color: '#dc3545' },
];

const DEFAULT_TAGS: EvidenceTag[] = [
  { id: 'source', name: 'Source', color: '#667eea' },
  { id: 'document', name: 'Document', color: '#17a2b8' },
  { id: 'testimony', name: 'Testimony', color: '#ffc107' },
  { id: 'digital', name: 'Digital', color: '#28a745' },
  { id: 'physical', name: 'Physical', color: '#fd7e14' },
  { id: 'corroborated', name: 'Corroborated', color: '#6f42c1' },
];

export const EvidenceBoard: React.FC<EvidenceBoardProps> = ({
  initialColumns = DEFAULT_COLUMNS,
  initialItems = [],
  initialTags = DEFAULT_TAGS,
  onItemsChange,
  onColumnsChange,
  onTagsChange,
  className = '',
  style,
}) => {
  const { keyboardNavigation } = useAccessibility();
  const [columns, setColumns] = useState<EvidenceColumn[]>(initialColumns);
  const [items, setItems] = useState<EvidenceItem[]>(initialItems);
  const [tags, setTags] = useState<EvidenceTag[]>(initialTags);
  const [filteredItems, setFilteredItems] = useState<EvidenceItem[]>(initialItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [dragContext, setDragContext] = useState<DragContext | null>(null);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<EvidenceItem>>({
    title: '',
    description: '',
    tags: [],
    columnId: initialColumns[0]?.id || 'new',
  });
  const [showAddTagForm, setShowAddTagForm] = useState(false);
  const [newTag, setNewTag] = useState<Partial<EvidenceTag>>({
    name: '',
    color: '#667eea',
  });

  // Filter items based on search and filters
  useEffect(() => {
    let result = items;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(term) || 
        item.description.toLowerCase().includes(term) ||
        tags.some(tag => 
          item.tags.includes(tag.id) && 
          tag.name.toLowerCase().includes(term)
        )
      );
    }
    
    // Apply tag filter
    if (selectedTags.length > 0) {
      result = result.filter(item => 
        selectedTags.every(tagId => item.tags.includes(tagId))
      );
    }
    
    // Apply status filter
    if (selectedStatuses.length > 0) {
      result = result.filter(item => 
        selectedStatuses.includes(item.status || '')
      );
    }
    
    // Apply priority filter
    if (selectedPriorities.length > 0) {
      result = result.filter(item => 
        selectedPriorities.includes(item.priority || '')
      );
    }
    
    setFilteredItems(result);
  }, [items, searchTerm, selectedTags, selectedStatuses, selectedPriorities, tags]);

  // Update column item counts
  useEffect(() => {
    const updatedColumns = columns.map(col => ({
      ...col,
      itemCount: items.filter(item => item.columnId === col.id).length
    }));
    setColumns(updatedColumns);
  }, [items, columns]);

  const handleAddItem = () => {
    if (!newItem.title?.trim()) return;
    
    const newItemObj: EvidenceItem = {
      id: uuidv4(),
      title: newItem.title || '',
      description: newItem.description || '',
      tags: newItem.tags || [],
      columnId: newItem.columnId || columns[0].id,
      createdAt: new Date(),
      updatedAt: new Date(),
      priority: newItem.priority || 'medium',
      source: newItem.source || '',
      confidence: newItem.confidence || 50,
      status: newItem.status || 'pending',
    };
    
    const updatedItems = [...items, newItemObj];
    setItems(updatedItems);
    if (onItemsChange) onItemsChange(updatedItems);
    
    // Reset form
    setNewItem({
      title: '',
      description: '',
      tags: [],
      columnId: columns[0].id,
    });
    setShowAddItemForm(false);
  };

  const handleDeleteItem = (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    setItems(updatedItems);
    if (onItemsChange) onItemsChange(updatedItems);
  };

  const handleUpdateItem = (id: string, updates: Partial<EvidenceItem>) => {
    const updatedItems = items.map(item => 
      item.id === id 
        ? { ...item, ...updates, updatedAt: new Date() } 
        : item
    );
    setItems(updatedItems);
    if (onItemsChange) onItemsChange(updatedItems);
  };

  const handleMoveItem = (itemId: string, newColumnId: string) => {
    handleUpdateItem(itemId, { columnId: newColumnId });
  };

  const handleAddTag = () => {
    if (!newTag.name?.trim()) return;
    
    const newTagObj: EvidenceTag = {
      id: uuidv4(),
      name: newTag.name || '',
      color: newTag.color || '#667eea',
    };
    
    const updatedTags = [...tags, newTagObj];
    setTags(updatedTags);
    if (onTagsChange) onTagsChange(updatedTags);
    
    // Reset form
    setNewTag({
      name: '',
      color: '#667eea',
    });
    setShowAddTagForm(false);
  };

  const handleDeleteTag = (id: string) => {
    // Remove tag from all items
    const updatedItems = items.map(item => ({
      ...item,
      tags: item.tags.filter(tagId => tagId !== id)
    }));
    
    // Remove tag from tags list
    const updatedTags = tags.filter(tag => tag.id !== id);
    
    setItems(updatedItems);
    setTags(updatedTags);
    if (onItemsChange) onItemsChange(updatedItems);
    if (onTagsChange) onTagsChange(updatedTags);
  };

  const handleDragStart = (e: React.DragEvent, item: EvidenceItem) => {
    e.dataTransfer.setData('text/plain', item.id);
    setDragContext({ type: 'evidence', id: item.id, columnId: item.columnId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    if (dragContext?.type === 'evidence' && dragContext.id) {
      handleMoveItem(dragContext.id, targetColumnId);
    }
    
    setDragContext(null);
  };

  const handleOpenMenu = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    setActiveCardId(cardId);
    setAnchorEl(e.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActiveCardId(null);
  };

  const handleMenuAction = (action: string) => {
    if (!activeCardId) return;
    
    switch (action) {
      case 'edit':
        // In a real app, you might open an edit dialog
        console.log(`Edit item ${activeCardId}`);
        break;
      case 'delete':
        handleDeleteItem(activeCardId);
        break;
      default:
        break;
    }
    
    handleCloseMenu();
  };

  // Group items by column
  const itemsByColumn: Record<string, EvidenceItem[]> = {};
  filteredItems.forEach(item => {
    if (!itemsByColumn[item.columnId]) {
      itemsByColumn[item.columnId] = [];
    }
    itemsByColumn[item.columnId].push(item);
  });

  const open = Boolean(anchorEl);

  return (
    <BoardContainer className={className} style={style}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2, 
        gap: 2,
        flexWrap: 'wrap'
      }}>
        <Typography variant="h5" component="h1">
          Evidence Board
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, flex: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search evidence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 250 }}
          />
          
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="filter"
          >
            <FilterListIcon />
          </IconButton>
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setShowAddItemForm(true)}
          >
            Add Evidence
          </Button>
        </Box>
      </Box>

      {/* Filters Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
        MenuListProps={{
          'aria-labelledby': 'filter-button',
        }}
      >
        <MenuItem onClick={handleCloseMenu}>
          <FormControl fullWidth size="small">
            <InputLabel>Tags</InputLabel>
            <Select
              multiple
              value={selectedTags}
              onChange={(e) => setSelectedTags(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Tags" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const tag = tags.find(t => t.id === value);
                    return (
                      <Chip 
                        key={value} 
                        label={tag?.name} 
                        size="small"
                        style={{ backgroundColor: tag?.color, color: 'white' }}
                      />
                    );
                  })}
                </Box>
              )}
            >
              {tags.map((tag) => (
                <MenuItem key={tag.id} value={tag.id}>
                  <Checkbox checked={selectedTags.indexOf(tag.id) > -1} />
                  <ListItemText primary={tag.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </MenuItem>
        
        <MenuItem onClick={handleCloseMenu}>
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              multiple
              value={selectedPriorities}
              onChange={(e) => setSelectedPriorities(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Priority" />}
            >
              {['low', 'medium', 'high', 'critical'].map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </MenuItem>
        
        <Divider />
        <MenuItem onClick={() => { setShowAddTagForm(true); handleCloseMenu(); }}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add Tag</ListItemText>
        </MenuItem>
      </Menu>

      {/* Columns */}
      <ColumnsContainer>
        {columns.map((column) => (
          <ColumnContainer
            key={column.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <ColumnHeader>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" component="h2">
                  {column.title}
                </Typography>
                <Chip 
                  label={column.itemCount} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
            </ColumnHeader>
            
            <ItemsContainer>
              {itemsByColumn[column.id]?.map((item) => (
                <EvidenceCard
                  key={item.id}
                  variant="outlined"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  sx={{ 
                    borderLeft: `4px solid ${column.color}`,
                    position: 'relative'
                  }}
                >
                  <CardHeader
                    title={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">{item.title}</Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenMenu(e, item.id)}
                          aria-label="more options"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                    }
                    subheader={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        {item.priority && (
                          <Chip 
                            label={item.priority} 
                            size="small" 
                            color={
                              item.priority === 'critical' ? 'error' :
                              item.priority === 'high' ? 'warning' :
                              item.priority === 'medium' ? 'info' : 'default'
                            }
                            variant="outlined"
                          />
                        )}
                        {item.confidence !== undefined && (
                          <Chip 
                            label={`${item.confidence}% confidence`} 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                  />
                  
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {item.description}
                    </Typography>
                    
                    {item.source && (
                      <Typography variant="caption" color="text.secondary">
                        Source: {item.source}
                      </Typography>
                    )}
                    
                    <Box sx={{ mt: 1 }}>
                      {item.tags.map(tagId => {
                        const tag = tags.find(t => t.id === tagId);
                        return tag ? (
                          <Chip 
                            key={tagId} 
                            label={tag.name} 
                            size="small"
                            style={{ 
                              backgroundColor: tag.color, 
                              color: 'white',
                              marginRight: 4,
                              marginBottom: 4
                            }}
                          />
                        ) : null;
                      })}
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <Tooltip title="Drag to move">
                      <DragIndicatorIcon fontSize="small" color="action" />
                    </Tooltip>
                  </CardActions>
                </EvidenceCard>
              ))}
              
              {(!itemsByColumn[column.id] || itemsByColumn[column.id].length === 0) && (
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 3, 
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}>
                  No evidence in this stage
                </Box>
              )}
            </ItemsContainer>
          </ColumnContainer>
        ))}
      </ColumnsContainer>

      {/* Add Item Dialog */}
      <Dialog 
        open={showAddItemForm} 
        onClose={() => setShowAddItemForm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Add New Evidence
          <IconButton
            aria-label="close"
            onClick={() => setShowAddItemForm(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              autoFocus
              margin="dense"
              label="Title"
              fullWidth
              variant="outlined"
              value={newItem.title || ''}
              onChange={(e) => setNewItem({...newItem, title: e.target.value})}
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={newItem.description || ''}
              onChange={(e) => setNewItem({...newItem, description: e.target.value})}
            />
            <TextField
              margin="dense"
              label="Source"
              fullWidth
              variant="outlined"
              value={newItem.source || ''}
              onChange={(e) => setNewItem({...newItem, source: e.target.value})}
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newItem.priority || 'medium'}
                label="Priority"
                onChange={(e) => setNewItem({...newItem, priority: e.target.value as any})}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
            <TextField
              type="number"
              margin="dense"
              label="Confidence Level (%)"
              fullWidth
              variant="outlined"
              value={newItem.confidence || 50}
              onChange={(e) => setNewItem({...newItem, confidence: parseInt(e.target.value) || 0})}
              inputProps={{ min: 0, max: 100 }}
            />
            <Autocomplete
              multiple
              options={tags}
              getOptionLabel={(option) => option.name}
              value={tags.filter(tag => newItem.tags?.includes(tag.id)) || []}
              onChange={(_, newValue) => {
                setNewItem({
                  ...newItem,
                  tags: newValue.map(tag => tag.id)
                });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Tags" variant="outlined" />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: option.color,
                      }}
                    />
                    {option.name}
                  </Box>
                </li>
              )}
            />
            <FormControl fullWidth>
              <InputLabel>Column</InputLabel>
              <Select
                value={newItem.columnId || columns[0]?.id}
                label="Column"
                onChange={(e) => setNewItem({...newItem, columnId: e.target.value})}
              >
                {columns.map(column => (
                  <MenuItem key={column.id} value={column.id}>
                    {column.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddItemForm(false)}>Cancel</Button>
          <Button onClick={handleAddItem} variant="contained">Add Evidence</Button>
        </DialogActions>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog 
        open={showAddTagForm} 
        onClose={() => setShowAddTagForm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Add New Tag
          <IconButton
            aria-label="close"
            onClick={() => setShowAddTagForm(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              autoFocus
              margin="dense"
              label="Tag Name"
              fullWidth
              variant="outlined"
              value={newTag.name || ''}
              onChange={(e) => setNewTag({...newTag, name: e.target.value})}
            />
            <TextField
              margin="dense"
              label="Color"
              fullWidth
              variant="outlined"
              type="color"
              value={newTag.color || '#667eea'}
              onChange={(e) => setNewTag({...newTag, color: e.target.value})}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddTagForm(false)}>Cancel</Button>
          <Button onClick={handleAddTag} variant="contained">Add Tag</Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu for Cards */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl && activeCardId)}
        onClose={handleCloseMenu}
        onClick={handleCloseMenu}
      >
        <MenuItem onClick={() => handleMenuAction('edit')}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </BoardContainer>
  );
};

export default EvidenceBoard;