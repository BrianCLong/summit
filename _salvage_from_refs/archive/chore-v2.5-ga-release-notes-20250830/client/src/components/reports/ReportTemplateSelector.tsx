import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Paper,
  Grid,
} from '@mui/material';
import { 
  Description, 
  Business, 
  Gavel, 
  Security,
  Analytics,
  Assessment,
} from '@mui/icons-material';
import { useReportTemplatesQuery, useGenerateReportMutation } from '../../generated/graphql';

interface ReportTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  investigationId?: string;
  selectionData?: any;
}

const TEMPLATE_ICONS = {
  Executive: Business,
  Forensics: Gavel,
  Operational: Security,
  Analytical: Analytics,
  Assessment: Assessment,
} as const;

const EXECUTIVE_TEMPLATE = {
  id: 'executive',
  name: 'Executive Summary',
  type: 'Executive',
  description: 'High-level overview for leadership and decision makers',
  sections: [
    { id: 'exec-summary', name: 'Executive Summary', type: 'summary', required: true },
    { id: 'key-findings', name: 'Key Findings', type: 'findings', required: true },
    { id: 'recommendations', name: 'Recommendations', type: 'recommendations', required: true },
    { id: 'risk-assessment', name: 'Risk Assessment', type: 'risk', required: false },
    { id: 'next-steps', name: 'Next Steps', type: 'actions', required: false },
  ],
};

const FORENSICS_TEMPLATE = {
  id: 'forensics',
  name: 'Forensics Report',
  type: 'Forensics',
  description: 'Detailed technical analysis for legal and compliance purposes',
  sections: [
    { id: 'chain-custody', name: 'Chain of Custody', type: 'custody', required: true },
    { id: 'methodology', name: 'Methodology', type: 'method', required: true },
    { id: 'technical-analysis', name: 'Technical Analysis', type: 'analysis', required: true },
    { id: 'evidence-summary', name: 'Evidence Summary', type: 'evidence', required: true },
    { id: 'timeline', name: 'Timeline of Events', type: 'timeline', required: false },
    { id: 'conclusions', name: 'Conclusions', type: 'conclusions', required: true },
    { id: 'appendices', name: 'Technical Appendices', type: 'appendix', required: false },
  ],
};

export function ReportTemplateSelector({ 
  open, 
  onClose, 
  investigationId,
  selectionData 
}: ReportTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');

  // Use hardcoded templates for now (would come from server in production)
  const templates = [EXECUTIVE_TEMPLATE, FORENSICS_TEMPLATE];
  const [generateReport, { loading }] = useGenerateReportMutation();

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  React.useEffect(() => {
    if (selectedTemplateData) {
      setSelectedSections(
        selectedTemplateData.sections
          .filter(s => s.required)
          .map(s => s.id)
      );
      setReportTitle(`${selectedTemplateData.name} - ${new Date().toLocaleDateString()}`);
    }
  }, [selectedTemplateData]);

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleGenerate = async () => {
    if (!selectedTemplateData || !reportTitle) return;

    try {
      await generateReport({
        variables: {
          input: {
            templateId: selectedTemplate,
            title: reportTitle,
            investigationId,
            selectionData,
            sections: selectedSections,
            format,
            metadata: {
              generatedBy: 'current-user', // Would come from auth context
              generatedAt: new Date().toISOString(),
            },
          },
        },
      });

      onClose();
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Generate Report</DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Select Report Template
          </Typography>
          
          <Grid container spacing={2}>
            {templates.map((template) => {
              const IconComponent = TEMPLATE_ICONS[template.type as keyof typeof TEMPLATE_ICONS] || Description;
              const isSelected = selectedTemplate === template.id;
              
              return (
                <Grid item xs={12} md={6} key={template.id}>
                  <Paper
                    elevation={isSelected ? 3 : 1}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: isSelected ? 2 : 0,
                      borderColor: 'primary.main',
                      '&:hover': { elevation: 2 },
                    }}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <IconComponent color={isSelected ? 'primary' : 'action'} />
                      <Typography variant="h6">
                        {template.name}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={template.type} 
                        color={isSelected ? 'primary' : 'default'}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      {template.description}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {selectedTemplateData && (
          <>
            <TextField
              fullWidth
              label="Report Title"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Report Sections
              </Typography>
              
              <List dense>
                {selectedTemplateData.sections.map((section) => (
                  <ListItem key={section.id} dense>
                    <ListItemIcon>
                      <Checkbox
                        checked={selectedSections.includes(section.id)}
                        onChange={() => handleSectionToggle(section.id)}
                        disabled={section.required}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={section.name}
                      secondary={section.required ? 'Required' : 'Optional'}
                    />
                    {section.required && (
                      <Chip size="small" label="Required" color="primary" />
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Export Format</InputLabel>
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'pdf' | 'docx')}
                label="Export Format"
              >
                <MenuItem value="pdf">PDF Report</MenuItem>
                <MenuItem value="docx">Word Document</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={!selectedTemplate || !reportTitle || selectedSections.length === 0 || loading}
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}