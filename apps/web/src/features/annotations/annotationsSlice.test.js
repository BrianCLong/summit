"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const annotationsSlice_1 = __importStar(require("./annotationsSlice"));
describe('annotationsSlice', () => {
    const baseState = (0, annotationsSlice_1.getInitialAnnotationState)();
    it('starts a draft with defaults', () => {
        const state = (0, annotationsSlice_1.default)(baseState, (0, annotationsSlice_1.startDraft)({ type: 'note' }));
        expect(state.activeDraft?.type).toBe('note');
        expect(state.activeDraft?.status).toBe('draft');
    });
    it('updates draft body and saves annotation as unsynced', () => {
        let state = (0, annotationsSlice_1.default)(baseState, (0, annotationsSlice_1.startDraft)({ type: 'note' }));
        state = (0, annotationsSlice_1.default)(state, (0, annotationsSlice_1.updateDraft)({ body: 'Important finding' }));
        expect(state.activeDraft?.body).toBe('Important finding');
        state = (0, annotationsSlice_1.default)(state, (0, annotationsSlice_1.saveDraft)());
        expect(state.annotations).toHaveLength(1);
        expect(state.annotations[0].status).toBe('unsynced');
        expect(state.selectedId).toBe(state.annotations[0].id);
    });
    it('restores a draft when a restore candidate exists', () => {
        const draft = (0, annotationsSlice_1.default)(baseState, (0, annotationsSlice_1.startDraft)({ type: 'note' })).activeDraft;
        const withRestore = {
            ...baseState,
            restoreCandidate: draft,
        };
        const restored = (0, annotationsSlice_1.default)(withRestore, (0, annotationsSlice_1.restoreDraft)());
        expect(restored.activeDraft?.id).toBe(draft.id);
        expect(restored.restoreCandidate).toBeNull();
    });
    it('discards restore candidates', () => {
        const withRestore = {
            ...baseState,
            restoreCandidate: (0, annotationsSlice_1.default)(baseState, (0, annotationsSlice_1.startDraft)({ type: 'note' })).activeDraft,
        };
        const next = (0, annotationsSlice_1.default)(withRestore, (0, annotationsSlice_1.discardRestoreCandidate)());
        expect(next.restoreCandidate).toBeNull();
    });
    it('selects annotations and updates type', () => {
        let state = (0, annotationsSlice_1.default)(baseState, (0, annotationsSlice_1.startDraft)({ type: 'note' }));
        state = (0, annotationsSlice_1.default)(state, (0, annotationsSlice_1.setDraftType)('pin'));
        expect(state.activeDraft?.type).toBe('pin');
        state = (0, annotationsSlice_1.default)(state, (0, annotationsSlice_1.updateDraft)({ body: 'Test annotation' }));
        state = (0, annotationsSlice_1.default)(state, (0, annotationsSlice_1.saveDraft)());
        const selected = (0, annotationsSlice_1.default)(state, (0, annotationsSlice_1.selectAnnotation)(state.annotations[0].id));
        expect(selected.selectedId).toBe(state.annotations[0].id);
    });
});
