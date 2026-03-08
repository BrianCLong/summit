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
const testing_1 = require("@apollo/client/testing");
const StatsOverview_1 = __importDefault(require("../StatsOverview"));
// Mock the generated GraphQL hook
jest.mock('../../../generated/graphql', () => ({
    useDB_ServerStatsQuery: jest.fn(() => ({
        data: {
            serverStats: {
                uptime: '2d 14h 32m',
                totalInvestigations: 128,
                totalEntities: 42137,
                totalRelationships: 89542,
            },
        },
        loading: false,
        error: null,
    })),
}));
describe('StatsOverview', () => {
    it('renders server stats correctly', async () => {
        (0, react_2.render)(<testing_1.MockedProvider mocks={[]}>
        <StatsOverview_1.default />
      </testing_1.MockedProvider>);
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('42,137')).toBeInTheDocument();
            expect(react_2.screen.getByText('89,542')).toBeInTheDocument();
            expect(react_2.screen.getByText('128')).toBeInTheDocument();
            expect(react_2.screen.getByText('2d 14h 32m')).toBeInTheDocument();
        });
        expect(react_2.screen.getByText('Total Entities')).toBeInTheDocument();
        expect(react_2.screen.getByText('Total Relationships')).toBeInTheDocument();
        expect(react_2.screen.getByText('Investigations')).toBeInTheDocument();
        expect(react_2.screen.getByText('Uptime')).toBeInTheDocument();
    });
    it('shows loading state', async () => {
        // Mock loading state
        jest.doMock('../../../generated/graphql', () => ({
            useDB_ServerStatsQuery: () => ({
                data: null,
                loading: true,
                error: null,
            }),
        }));
        const { useDB_ServerStatsQuery } = await Promise.resolve().then(() => __importStar(require('../../../generated/graphql')));
        (0, react_2.render)(<testing_1.MockedProvider mocks={[]}>
        <StatsOverview_1.default />
      </testing_1.MockedProvider>);
        expect(react_2.screen.getAllByTestId('skeleton')).toHaveLength(4);
    });
});
