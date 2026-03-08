"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDraftType = exports.discardRestoreCandidate = exports.restoreDraft = exports.selectAnnotation = exports.updateAnnotation = exports.saveDraft = exports.clearDraft = exports.setDraftTarget = exports.updateDraft = exports.startDraft = exports.getInitialAnnotationState = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const toolkit_1 = require("@reduxjs/toolkit");
const STORAGE_KEY = 'annotations.draft';
const loadDraftFromStorage = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return undefined;
        const parsed = JSON.parse(raw);
        if (!parsed.body)
            return undefined;
        return parsed;
    }
    catch {
        return undefined;
    }
};
const saveDraftToStorage = (draft) => {
    if (!draft || !draft.body) {
        localStorage.removeItem(STORAGE_KEY);
        return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
};
const getInitialAnnotationState = () => ({
    annotations: [],
    activeDraft: undefined,
    selectedId: undefined,
    restoreCandidate: loadDraftFromStorage() ?? null,
});
exports.getInitialAnnotationState = getInitialAnnotationState;
const annotateTarget = (context) => {
    if (context?.timelineEvent) {
        return {
            kind: 'event',
            id: context.timelineEvent.id,
            label: context.timelineEvent.title ?? 'Timeline event',
        };
    }
    if (context?.entity) {
        return {
            kind: 'entity',
            id: context.entity.id,
            label: context.entity.name,
        };
    }
    if (context?.location) {
        return {
            kind: 'location',
            id: context.location.id,
            label: context.location.location.name ?? 'Location',
        };
    }
    return undefined;
};
const slice = (0, toolkit_1.createSlice)({
    name: 'annotations',
    initialState: (0, exports.getInitialAnnotationState)(),
    reducers: {
        startDraft(state, action) {
            const now = new Date().toISOString();
            state.activeDraft = {
                id: (0, toolkit_1.nanoid)(),
                type: action.payload.type ?? 'note',
                targetRef: annotateTarget(action.payload.context),
                body: '',
                createdAt: now,
                updatedAt: now,
                status: 'draft',
            };
            state.restoreCandidate = null;
            saveDraftToStorage(state.activeDraft);
        },
        updateDraft(state, action) {
            if (!state.activeDraft)
                return;
            state.activeDraft.body = action.payload.body;
            state.activeDraft.updatedAt = new Date().toISOString();
            state.activeDraft.status = 'draft';
            saveDraftToStorage(state.activeDraft);
        },
        setDraftTarget(state, action) {
            if (!state.activeDraft)
                return;
            state.activeDraft.targetRef = action.payload;
            state.activeDraft.updatedAt = new Date().toISOString();
            saveDraftToStorage(state.activeDraft);
        },
        setDraftType(state, action) {
            if (!state.activeDraft)
                return;
            state.activeDraft.type = action.payload;
            state.activeDraft.updatedAt = new Date().toISOString();
            saveDraftToStorage(state.activeDraft);
        },
        clearDraft(state) {
            state.activeDraft = undefined;
            state.restoreCandidate = null;
            saveDraftToStorage(undefined);
        },
        saveDraft(state) {
            if (!state.activeDraft || !state.activeDraft.body.trim())
                return;
            const now = new Date().toISOString();
            const annotation = {
                ...state.activeDraft,
                createdAt: state.activeDraft.createdAt || now,
                updatedAt: now,
                status: 'unsynced',
            };
            state.annotations.unshift(annotation);
            state.selectedId = annotation.id;
            state.activeDraft = undefined;
            state.restoreCandidate = null;
            saveDraftToStorage(undefined);
        },
        updateAnnotation(state, action) {
            const annotation = state.annotations.find(a => a.id === action.payload.id);
            if (!annotation)
                return;
            annotation.updatedAt = new Date().toISOString();
            annotation.status = 'unsynced';
            if (typeof action.payload.body === 'string') {
                annotation.body = action.payload.body;
            }
            if (action.payload.targetRef) {
                annotation.targetRef = action.payload.targetRef;
            }
        },
        selectAnnotation(state, action) {
            state.selectedId = action.payload;
        },
        restoreDraft(state) {
            if (state.restoreCandidate) {
                state.activeDraft = {
                    ...state.restoreCandidate,
                    status: 'draft',
                    updatedAt: new Date().toISOString(),
                };
            }
            state.restoreCandidate = null;
        },
        discardRestoreCandidate(state) {
            state.restoreCandidate = null;
            saveDraftToStorage(undefined);
        },
    },
});
_a = slice.actions, exports.startDraft = _a.startDraft, exports.updateDraft = _a.updateDraft, exports.setDraftTarget = _a.setDraftTarget, exports.clearDraft = _a.clearDraft, exports.saveDraft = _a.saveDraft, exports.updateAnnotation = _a.updateAnnotation, exports.selectAnnotation = _a.selectAnnotation, exports.restoreDraft = _a.restoreDraft, exports.discardRestoreCandidate = _a.discardRestoreCandidate, exports.setDraftType = _a.setDraftType;
exports.default = slice.reducer;
