import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Vite env vars - babel transforms import.meta.env to process.env
process.env.VITE_GRAFANA_URL = process.env.VITE_GRAFANA_URL || 'http://localhost:3000';
process.env.VITE_GRAFANA_MAESTRO_DASH_UID = process.env.VITE_GRAFANA_MAESTRO_DASH_UID || 'test-dashboard';
process.env.VITE_API_URL = process.env.VITE_API_URL || 'http://localhost:8080';
process.env.MODE = 'test';
process.env.DEV = 'false';
process.env.PROD = 'false';

// Manual fetch mock since whatwg-fetch might be missing
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
    })
);

// --- Browser APIs ---

// window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() { }
    observe() {
        return null;
    }
    unobserve() {
        return null;
    }
    disconnect() {
        return null;
    }
};

// scroll polyfills for JSDOM
const noop = () => { };
Element.prototype.scrollTo = noop;
Element.prototype.scrollBy = noop;
Element.prototype.scrollIntoView = noop;
HTMLElement.prototype.scrollTo = noop;
HTMLElement.prototype.scrollBy = noop;
HTMLElement.prototype.scrollIntoView = noop;
window.scrollTo = noop;

// HTMLCanvasElement.prototype.getContext
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    writable: true,
    value: jest.fn(() => ({
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        getImageData: jest.fn(() => ({ data: [] })),
        putImageData: jest.fn(),
        createImageData: jest.fn(() => []),
        setTransform: jest.fn(),
        drawImage: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        stroke: jest.fn(),
        translate: jest.fn(),
        scale: jest.fn(),
        rotate: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        measureText: jest.fn(() => ({ width: 0 })),
        transform: jest.fn(),
        rect: jest.fn(),
        clip: jest.fn(),
    })),
});

// SpeechRecognition mock for voice input tests
class FakeSpeechRecognition {
    constructor() {
        if (!window.__srInstances) {
            window.__srInstances = [];
        }
        window.__srInstances.push(this);
    }
    start() {
        if (this.onstart) this.onstart();
    }
    stop() {
        if (this.onend) this.onend();
    }
}

Object.defineProperty(window, 'SpeechRecognition', {
    writable: true,
    value: FakeSpeechRecognition,
});
Object.defineProperty(window, 'webkitSpeechRecognition', {
    writable: true,
    value: FakeSpeechRecognition,
});

// --- Auth Mocks ---
// Mock the AuthContext used by useAuth
jest.mock('./context/AuthContext', () => ({
    useAuth: jest.fn(() => ({
        user: {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test.at.example.com',
            roles: ['admin', 'analyst']
        },
        login: jest.fn(),
        logout: jest.fn(),
        isAuthenticated: true,
        isLoading: false,
        error: null,
        filterByAccess: jest.fn(() => true),
    })),
    AuthProvider: ({ children }) => <div>{children}</div>,
}));

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock withAuthorization for RBAC checks
jest.mock('./auth/withAuthorization', () => ({
    useAuthorization: jest.fn(() => ({
        isAuthorized: true,
        hasRole: jest.fn(() => true),
        hasPermission: jest.fn(() => true),
        filterByAccess: jest.fn((items) => items),
    })),
    withAuthorization: (arg) => {
        const React = require('react');
        // Check if called with Component (function) or options (object)
        if (typeof arg === 'function') {
            return (props) => React.createElement(arg, props);
        }
        return (Component) => (props) => React.createElement(Component, props);
    },
}));

// --- Router Mocks ---
// Mock react-router-dom to prevent nesting errors and provide defaults
jest.mock('react-router-dom', () => {
    const React = require('react');
    const originalModule = jest.requireActual('react-router-dom');
    return {
        ...originalModule,
        useNavigate: jest.fn(() => jest.fn()),
        useLocation: jest.fn(() => ({
            pathname: '/',
            search: '',
            hash: '',
            state: null,
        })),
        useParams: jest.fn(() => ({})),
        Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
        NavLink: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
    };
});

// Mock react-router for Link component
jest.mock('react-router', () => {
    const React = require('react');
    const originalModule = jest.requireActual('react-router');
    return {
        ...originalModule,
        Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
        NavLink: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
    };
});

// --- Apollo Client Mocks ---
jest.mock('@apollo/client', () => {
    const React = require('react');
    const actualApollo = jest.requireActual('@apollo/client');
    return {
        ...actualApollo,
        useQuery: jest.fn(() => ({
            data: undefined,
            loading: false,
            error: undefined,
            refetch: jest.fn(),
        })),
        useMutation: jest.fn(() => [
            jest.fn(),
            { data: undefined, loading: false, error: undefined },
        ]),
        useSubscription: jest.fn(() => ({
            data: undefined,
            loading: false,
            error: undefined,
        })),
        useLazyQuery: jest.fn(() => [
            jest.fn(),
            { data: undefined, loading: false, error: undefined },
        ]),
        ApolloProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    };
});

// Mock recharts as it relies on DOM measurements
jest.mock('recharts', () => {
    const React = require('react');
    return {
        ResponsiveContainer: ({ children }) => <div>{children}</div>,
        BarChart: ({ children }) => <div>{children}</div>,
        Bar: () => <div />,
        XAxis: () => <div />,
        YAxis: () => <div />,
        CartesianGrid: () => <div />,
        Tooltip: () => <div />,
        Legend: () => <div />,
        LineChart: ({ children }) => <div>{children}</div>,
        Line: () => <div />,
        PieChart: ({ children }) => <div>{children}</div>,
        Pie: () => <div />,
        Cell: () => <div />,
        AreaChart: ({ children }) => <div>{children}</div>,
        Area: () => <div />,
        ScatterChart: ({ children }) => <div>{children}</div>,
        Scatter: () => <div />,
        ZAxis: () => <div />,
        RadarChart: ({ children }) => <div>{children}</div>,
        Radar: () => <div />,
        PolarGrid: () => <div />,
        PolarAngleAxis: () => <div />,
        PolarRadiusAxis: () => <div />,
    };
});
