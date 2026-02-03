import { jest } from '@jest/globals';

const mockPptxGen = jest.fn().mockImplementation(() => ({
    addSlide: jest.fn(),
    writeFile: jest.fn().mockResolvedValue(undefined),
}));

export default mockPptxGen;
