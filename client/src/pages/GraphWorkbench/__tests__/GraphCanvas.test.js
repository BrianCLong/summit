"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const testing_1 = require("@apollo/client/testing");
const GraphCanvas_1 = __importDefault(require("../GraphCanvas"));
jest.mock('cytoscape', () => () => ({
    destroy: jest.fn(),
    add: jest.fn(),
    layout: jest.fn(() => ({ run: jest.fn() })),
    elements: jest.fn(() => ({ unselect: jest.fn() })),
    nodes: jest.fn(() => ({ forEach: jest.fn() })),
    $: jest.fn(() => ({ find: jest.fn() })),
    $id: jest.fn(() => ({
        grabbed: jest.fn(() => false),
        ungrabify: jest.fn(),
        grabify: jest.fn(),
    })),
    fit: jest.fn(),
}));
// Mock the generated GraphQL hooks
jest.mock('../../../generated/graphql.js', () => ({
    useGwGraphDataQuery: () => ({
        data: {
            graphData: {
                nodes: [
                    {
                        id: '1',
                        label: 'Test Node',
                        type: 'Test',
                        description: 'Test node',
                    },
                ],
                edges: [
                    {
                        id: '1',
                        fromEntityId: '1',
                        toEntityId: '1',
                        label: 'Test Edge',
                        type: 'Test',
                    },
                ],
            },
        },
        loading: false,
        error: null,
    }),
    useGwSearchEntitiesLazyQuery: () => [
        jest.fn(),
        { data: null, loading: false },
    ],
}));
test('mounts graph canvas and binds interactions', () => {
    (0, react_2.render)(<testing_1.MockedProvider mocks={[]}>
      <GraphCanvas_1.default />
    </testing_1.MockedProvider>);
});
