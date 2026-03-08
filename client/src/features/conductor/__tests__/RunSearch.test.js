"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const RunSearch_1 = __importDefault(require("../RunSearch"));
const withAuthorization_1 = require("../../../auth/withAuthorization");
jest.mock('../../../auth/withAuthorization');
const mockedUseAuthorization = withAuthorization_1.useAuthorization;
const originalFetch = global.fetch;
describe('RunSearch', () => {
    beforeEach(() => {
        mockedUseAuthorization.mockReset();
    });
    afterEach(() => {
        global.fetch = originalFetch;
    });
    it('issues a tenant-scoped search when authorized', async () => {
        mockedUseAuthorization.mockReturnValue({
            canAccess: jest.fn().mockReturnValue(true),
            tenant: 'tenant-scope',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        });
        const mockFetch = jest.fn(() => Promise.resolve({
            json: () => Promise.resolve({ data: { searchRuns: [] } }),
        }));
        global.fetch = mockFetch;
        (0, react_2.render)(<RunSearch_1.default />);
        react_2.fireEvent.click(react_2.screen.getByTestId('run-search-submit'));
        await (0, react_2.waitFor)(() => expect(mockFetch).toHaveBeenCalled());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstCall = mockFetch.mock.calls[0];
        const requestInit = firstCall[1];
        const body = JSON.parse(requestInit.body);
        expect(body.query).toContain('"tenant":"tenant-scope"');
    });
    it('blocks search and shows message when unauthorized', async () => {
        mockedUseAuthorization.mockReturnValue({
            canAccess: jest.fn().mockReturnValue(false),
            tenant: 'tenant-scope',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        });
        const mockFetch = jest.fn();
        global.fetch = mockFetch;
        (0, react_2.render)(<RunSearch_1.default />);
        react_2.fireEvent.click(react_2.screen.getByTestId('run-search-submit'));
        expect(react_2.screen.getByTestId('run-search-denied')).toBeInTheDocument();
        await (0, react_2.waitFor)(() => expect(mockFetch).not.toHaveBeenCalled());
    });
});
