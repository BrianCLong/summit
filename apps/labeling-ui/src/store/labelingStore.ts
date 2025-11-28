/**
 * Labeling UI - Zustand Store
 *
 * Global state management for labeling workflow.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Sample, LabelingJob, Label, TaskType } from '../types';

interface LabelingState {
  // Current user
  userId: string;
  setUserId: (userId: string) => void;

  // Current labeling session
  currentJob: LabelingJob | null;
  currentSample: Sample | null;
  setCurrentJob: (job: LabelingJob | null) => void;
  setCurrentSample: (sample: Sample | null) => void;

  // Labels being created
  pendingLabels: Label[];
  addLabel: (label: Label) => void;
  updateLabel: (index: number, label: Label) => void;
  removeLabel: (index: number) => void;
  clearLabels: () => void;

  // Session tracking
  sessionStartTime: number | null;
  startSession: () => void;
  getTimeSpent: () => number;

  // Notes
  notes: string;
  setNotes: (notes: string) => void;

  // Confidence
  confidence: number | null;
  setConfidence: (confidence: number | null) => void;

  // Task type settings
  taskInstructions: Record<TaskType, string>;
  getInstructions: (taskType: TaskType) => string;

  // Keyboard shortcuts enabled
  keyboardShortcutsEnabled: boolean;
  toggleKeyboardShortcuts: () => void;

  // Reset session
  resetSession: () => void;
}

const defaultInstructions: Record<TaskType, string> = {
  entity_match:
    'Review the two entities and determine if they refer to the same real-world entity. Consider name variations, typos, and contextual information.',
  entity_no_match:
    'Confirm that the two entities are NOT the same. Look for distinguishing characteristics.',
  cluster_review:
    'Review the cluster of entities and verify they are correctly grouped. Identify any outliers.',
  claim_assessment:
    'Evaluate the claim based on available evidence. Rate the claim as Supported, Refuted, or Insufficient Evidence.',
  safety_decision:
    'Assess the content for safety issues. Flag any content that violates guidelines.',
  relationship_validation:
    'Verify the relationship between entities is correctly identified and typed.',
  text_classification:
    'Classify the text according to the provided categories. Select the most appropriate label.',
  named_entity_recognition:
    'Identify and tag named entities in the text. Mark the start and end positions.',
  sequence_labeling:
    'Label each token in the sequence according to the schema.',
};

export const useLabelingStore = create<LabelingState>()(
  persist(
    (set, get) => ({
      // User
      userId: localStorage.getItem('userId') || 'anonymous',
      setUserId: (userId) => {
        localStorage.setItem('userId', userId);
        set({ userId });
      },

      // Current session
      currentJob: null,
      currentSample: null,
      setCurrentJob: (job) => set({ currentJob: job }),
      setCurrentSample: (sample) => set({ currentSample: sample }),

      // Labels
      pendingLabels: [],
      addLabel: (label) =>
        set((state) => ({ pendingLabels: [...state.pendingLabels, label] })),
      updateLabel: (index, label) =>
        set((state) => ({
          pendingLabels: state.pendingLabels.map((l, i) =>
            i === index ? label : l
          ),
        })),
      removeLabel: (index) =>
        set((state) => ({
          pendingLabels: state.pendingLabels.filter((_, i) => i !== index),
        })),
      clearLabels: () => set({ pendingLabels: [] }),

      // Session tracking
      sessionStartTime: null,
      startSession: () => set({ sessionStartTime: Date.now() }),
      getTimeSpent: () => {
        const { sessionStartTime } = get();
        if (!sessionStartTime) return 0;
        return Math.floor((Date.now() - sessionStartTime) / 1000);
      },

      // Notes
      notes: '',
      setNotes: (notes) => set({ notes }),

      // Confidence
      confidence: null,
      setConfidence: (confidence) => set({ confidence }),

      // Instructions
      taskInstructions: defaultInstructions,
      getInstructions: (taskType) => {
        const { taskInstructions } = get();
        return taskInstructions[taskType] || 'Complete the labeling task.';
      },

      // Keyboard shortcuts
      keyboardShortcutsEnabled: true,
      toggleKeyboardShortcuts: () =>
        set((state) => ({
          keyboardShortcutsEnabled: !state.keyboardShortcutsEnabled,
        })),

      // Reset
      resetSession: () =>
        set({
          currentJob: null,
          currentSample: null,
          pendingLabels: [],
          sessionStartTime: null,
          notes: '',
          confidence: null,
        }),
    }),
    {
      name: 'labeling-storage',
      partialize: (state) => ({
        userId: state.userId,
        keyboardShortcutsEnabled: state.keyboardShortcutsEnabled,
      }),
    }
  )
);
