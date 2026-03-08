"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
/**
 * Tests for Enhanced AI Assistant Component - Deterministic Version
 */
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
const react_1 = __importStar(require("react"));
const react_2 = require("@testing-library/react");
const user_1 = require("../test-utils/user");
const styles_1 = require("@mui/material/styles");
const EnhancedAIAssistant_1 = __importDefault(require("../EnhancedAIAssistant"));
const fakes_1 = require("../test-utils/fakes");
const text_1 = require("../test-utils/text");
const voice_1 = require("../test-utils/voice");
const wait_1 = require("../test-utils/wait");
const theme = (0, styles_1.createTheme)();
const renderWithTheme = (component) => {
    return (0, react_2.render)(<styles_1.ThemeProvider theme={theme}>{component}</styles_1.ThemeProvider>);
};
const getUserMessages = () => react_2.screen.queryAllByRole('article', { name: /user/i });
// Global timeout for this file
jest.setTimeout(60000);
describe('EnhancedAIAssistant', () => {
    let writeTextMock;
    beforeAll(() => {
        jest.useRealTimers();
    });
    beforeEach(() => {
        writeTextMock = jest.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            configurable: true,
            writable: true,
        });
        window.__srInstances = [];
    });
    afterEach(() => {
        jest.clearAllMocks();
        window.__srInstances?.forEach((i) => {
            try {
                i.stop();
            }
            catch (e) { }
        });
        window.__srInstances = [];
        jest.useRealTimers();
    });
    const defaultProps = {
        onQueryGenerate: jest.fn(),
        onNavigate: jest.fn(),
        enableVoice: true,
        enableProactiveSuggestions: true,
    };
    it('renders initial welcome message', async () => {
        renderWithTheme(<EnhancedAIAssistant_1.default {...defaultProps}/>);
        const log = await react_2.screen.findByTestId('message-log');
        await (0, text_1.expectTextAcrossElements)(log, /Hello! I'm IntelBot/i);
    });
    it('sends message when user types and presses enter', async () => {
        renderWithTheme(<EnhancedAIAssistant_1.default {...defaultProps}/>);
        const input = react_2.screen.getByRole('textbox', { name: /assistant-input/i });
        await (0, user_1.withUser)(async (u) => {
            await u.type(input, 'Hello{enter}');
        });
        await (0, react_2.waitFor)(() => {
            const items = getUserMessages();
            if (items.length === 0)
                throw new Error('No user messages found');
            expect(items[items.length - 1]).toHaveTextContent('Hello');
        });
        await (0, wait_1.waitForIdle)();
    });
    it('streams assistant tokens and settles to idle', async () => {
        const script = [
            { type: 'status', value: 'thinking' },
            { type: 'token', value: 'I ' },
            { type: 'token', value: 'think ' },
            { type: 'token', value: 'therefore ' },
            { type: 'token', value: 'I ' },
            { type: 'token', value: 'am.' },
            { type: 'done' },
        ];
        const transport = (0, fakes_1.makeFakeTransport)(script);
        renderWithTheme(<EnhancedAIAssistant_1.default {...defaultProps} transport={transport}/>);
        const input = react_2.screen.getByRole('textbox', { name: /assistant-input/i });
        await (0, user_1.withUser)(async (u) => {
            await u.type(input, 'Hello stream{enter}');
        });
        await (0, text_1.expectLastAssistantMessageToContain)(/I think therefore I am/i);
        await (0, wait_1.waitForIdle)();
    });
    it('voice input pipes transcript into the log deterministically', async () => {
        renderWithTheme(<EnhancedAIAssistant_1.default {...defaultProps}/>);
        const micButton = react_2.screen.getByLabelText(/start voice/i);
        react_2.fireEvent.click(micButton);
        // Wait for instance creation
        await (0, react_2.waitFor)(() => {
            const insts = window.__srInstances;
            if (!insts || insts.length === 0)
                throw new Error('No instances');
        }, { timeout: 10000 });
        await (0, react_1.act)(async () => {
            await (0, voice_1.emitSpeechResult)('I understand your query');
        });
        await (0, react_2.waitFor)(() => {
            const items = getUserMessages();
            if (items.length === 0)
                throw new Error('No user messages found');
            expect(items[items.length - 1]).toHaveTextContent(/I understand your query/i);
        });
    }, 30000);
    it('toggles voice commands', async () => {
        renderWithTheme(<EnhancedAIAssistant_1.default {...defaultProps} enableVoice={true}/>);
        const startBtn = react_2.screen.getByLabelText(/start voice/i);
        react_2.fireEvent.click(startBtn);
        expect(await react_2.screen.findByLabelText(/stop voice/i)).toBeInTheDocument();
        const stopBtn = react_2.screen.getByLabelText(/stop voice/i);
        react_2.fireEvent.click(stopBtn);
        expect(await react_2.screen.findByLabelText(/start voice/i)).toBeInTheDocument();
    }, 20000);
    it('handles multiline input correctly', async () => {
        renderWithTheme(<EnhancedAIAssistant_1.default {...defaultProps}/>);
        const input = react_2.screen.getByRole('textbox', { name: /assistant-input/i });
        await (0, user_1.withUser)(async (u) => {
            await u.type(input, 'Line 1{shift>}{enter}{/shift}Line 2');
            await u.keyboard('{enter}');
        });
        await (0, react_2.waitFor)(() => {
            const items = getUserMessages();
            if (items.length === 0)
                throw new Error('No user messages found');
            expect(items[items.length - 1]).toHaveTextContent('Line 1');
        });
        await (0, wait_1.waitForIdle)();
    });
    it('allows copying message content', async () => {
        renderWithTheme(<EnhancedAIAssistant_1.default {...defaultProps}/>);
        const copyButton = await react_2.screen.findByLabelText(/copy message/i);
        await (0, user_1.withUser)(async (u) => {
            await u.click(copyButton);
        });
        expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("Hello! I'm IntelBot"));
    });
    it('legacy fallback streams and completes to idle', async () => {
        renderWithTheme(<EnhancedAIAssistant_1.default {...defaultProps} typingDelayMs={0} debounceMs={0}/>);
        const input = react_2.screen.getByRole('textbox', { name: /assistant-input/i });
        await (0, user_1.withUser)(async (u) => {
            await u.type(input, 'fallback test{enter}');
        });
        await (0, text_1.expectLastAssistantMessageToContain)(/I understand your question/i, 20000);
        await (0, wait_1.waitForIdle)();
    }, 30000);
    it('displays "cannot confirm" message when RAG is strict and no cites are provided', async () => {
        process.env.ASSISTANT_RAG_STRICT = '1';
        const script = [
            { type: 'status', value: 'thinking' },
            { type: 'token', value: 'No cites here.' },
            { type: 'done', cites: [] },
        ];
        const transport = (0, fakes_1.makeFakeTransport)(script);
        const clock = (0, fakes_1.makeFakeClock)();
        renderWithTheme(<EnhancedAIAssistant_1.default {...defaultProps} transport={transport} clock={clock} typingDelayMs={0} debounceMs={0}/>);
        const input = react_2.screen.getByRole('textbox', { name: /assistant-input/i });
        await (0, user_1.withUser)(async (u) => {
            await u.type(input, 'strict rag test{enter}');
        });
        await (0, text_1.expectLastAssistantMessageToContain)(/I cannot confirm/i);
        process.env.ASSISTANT_RAG_STRICT = undefined;
    }, 30000);
});
