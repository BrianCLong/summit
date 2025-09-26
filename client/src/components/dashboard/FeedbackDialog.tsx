import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@apollo/client';
import { useToastHelpers } from '../ToastContainer';
import { SUBMIT_FEEDBACK_MUTATION } from '../../graphql/feedback';

type FeedbackCategory = 'BUG' | 'FEATURE' | 'OTHER';

interface FeedbackFormValues {
  category: FeedbackCategory;
  title: string;
  description: string;
  contact?: string;
}

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const categories: { value: FeedbackCategory; label: string; helper: string }[] = [
  { value: 'BUG', label: 'Bug report', helper: 'Report defects, glitches, or broken flows.' },
  { value: 'FEATURE', label: 'Feature request', helper: 'Suggest enhancements or new capabilities.' },
  { value: 'OTHER', label: 'General feedback', helper: 'Share workflow notes or anything else.' },
];

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ open, onClose, onSubmitted }) => {
  const toast = useToastHelpers();
  const [submitFeedback, { loading }] = useMutation(SUBMIT_FEEDBACK_MUTATION);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackFormValues>({
    defaultValues: {
      category: 'BUG',
      title: '',
      description: '',
      contact: '',
    },
  });

  const handleClose = React.useCallback(() => {
    if (!loading) {
      reset();
      setSubmissionError(null);
      onClose();
    }
  }, [loading, onClose, reset]);

  const onSubmit = async (values: FeedbackFormValues) => {
    setSubmissionError(null);
    try {
      await submitFeedback({
        variables: {
          input: {
            category: values.category,
            title: values.title.trim(),
            description: values.description.trim(),
            contact: values.contact?.trim() || undefined,
          },
        },
      });
      toast.success('Feedback sent', 'Thanks! Our team will review your note.');
      reset();
      onSubmitted?.();
      onClose();
    } catch (error: any) {
      setSubmissionError(error?.message || 'Failed to submit feedback.');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} aria-labelledby="feedback-dialog-title" fullWidth maxWidth="sm">
      <DialogTitle id="feedback-dialog-title">Share product feedback</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Tell us about a bug, request a capability, or leave general notes. We review every submission.
        </Typography>

        {submissionError && (
          <Alert severity="error" sx={{ mb: 2 }} data-testid="feedback-error">
            {submissionError}
          </Alert>
        )}

        <Box component="form" id="feedback-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller
            name="category"
            control={control}
            rules={{ required: 'Pick a category so we can triage quickly.' }}
            render={({ field }) => (
              <TextField
                {...field}
                select
                fullWidth
                label="Category"
                margin="dense"
                helperText={errors.category?.message || categories.find((c) => c.value === field.value)?.helper}
                error={!!errors.category}
                data-testid="feedback-category"
              >
                {categories.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="title"
            control={control}
            rules={{
              required: 'Give your feedback a short title.',
              minLength: { value: 4, message: 'Please add at least 4 characters.' },
              maxLength: { value: 200, message: 'Keep titles under 200 characters.' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Title"
                placeholder="Dashboard latency widget is empty"
                fullWidth
                margin="dense"
                error={!!errors.title}
                helperText={errors.title?.message || 'A concise summary helps us route the feedback.'}
                inputProps={{ maxLength: 200 }}
                data-testid="feedback-title"
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            rules={{
              required: 'Please describe what happened or what you need.',
              minLength: { value: 10, message: 'A little more detail will help us investigate.' },
              maxLength: { value: 5000, message: 'Limit feedback to 5000 characters.' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Details"
                placeholder="Include reproduction steps, expected behavior, or impact."
                fullWidth
                margin="dense"
                multiline
                minRows={4}
                error={!!errors.description}
                helperText={errors.description?.message || 'Provide context so the admin team can follow up.'}
                inputProps={{ maxLength: 5000 }}
                data-testid="feedback-description"
              />
            )}
          />

          <Controller
            name="contact"
            control={control}
            rules={{
              maxLength: { value: 320, message: 'Contact info should be under 320 characters.' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Preferred contact (optional)"
                placeholder="you@example.com or Slack handle"
                fullWidth
                margin="dense"
                error={!!errors.contact}
                helperText={
                  errors.contact?.message || 'We will use this only if we need more information.'
                }
                inputProps={{ maxLength: 320 }}
                data-testid="feedback-contact"
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading || isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="feedback-form"
          variant="contained"
          disabled={loading || isSubmitting}
          data-testid="feedback-submit"
        >
          {loading || isSubmitting ? 'Sending…' : 'Send feedback'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
