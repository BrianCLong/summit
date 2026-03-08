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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const react_redux_1 = require("react-redux");
const toolkit_1 = require("@reduxjs/toolkit");
const annotationsSlice_1 = __importStar(require("./annotationsSlice"));
const AnnotationPanel_1 = require("./AnnotationPanel");
const renderWithStore = (ui) => {
    const store = (0, toolkit_1.configureStore)({
        reducer: { annotations: annotationsSlice_1.default },
    });
    return (0, react_2.render)(<react_redux_1.Provider store={store}>{ui}</react_redux_1.Provider>);
};
describe('AnnotationPanel', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    it.skip('autosaves draft to localStorage and restores with prompt', async () => {
        const user = user_event_1.default.setup();
        const { unmount } = renderWithStore(<AnnotationPanel_1.AnnotationPanel />);
        const body = react_2.screen.getByLabelText('Annotation body');
        await user.click(body);
        await user.type(body, 'Draft note survives reload');
        await (0, react_2.waitFor)(() => {
            expect(localStorage.getItem('annotations.draft')).toContain('Draft note survives reload');
        });
        unmount();
        // Render with fresh store that picks up draft from storage
        const store = (0, toolkit_1.configureStore)({
            reducer: { annotations: annotationsSlice_1.default },
            preloadedState: {
                annotations: (0, annotationsSlice_1.getInitialAnnotationState)(),
            },
        });
        (0, react_2.render)(<react_redux_1.Provider store={store}>
        <AnnotationPanel_1.AnnotationPanel />
      </react_redux_1.Provider>);
        expect(react_2.screen.getByText('Restore your unsaved draft?')).toBeInTheDocument();
        await user.click(react_2.screen.getByRole('button', { name: /restore/i }));
        expect(react_2.screen.getByLabelText('Annotation body')).toHaveValue('Draft note survives reload');
    });
});
