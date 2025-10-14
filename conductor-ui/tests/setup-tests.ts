import '@testing-library/jest-dom';
import 'jest-canvas-mock';

global.fetch = jest.fn(() =>
  Promise.resolve({
    text: () => Promise.resolve('ok'),
    json: () => Promise.resolve({}),
  })
);
