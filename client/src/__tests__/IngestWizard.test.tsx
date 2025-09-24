import * as React from 'react';
import * as testingLibrary from '@testing-library/react';
import axe = require('axe-core');
import { IngestWizard } from '../features/ingest-wizard/IngestWizard';

let canvasGetContextDescriptor: PropertyDescriptor | undefined;
let canvasToDataURLDescriptor: PropertyDescriptor | undefined;
let originalGetComputedStyle: typeof window.getComputedStyle | undefined;

const createMockCanvasContext = (): CanvasRenderingContext2D =>
  ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray() })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Uint8ClampedArray() })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
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
    setLineDash: jest.fn(),
    getLineDash: jest.fn(() => []),
  }) as unknown as CanvasRenderingContext2D;

beforeAll(() => {
  if (typeof window.HTMLCanvasElement !== 'undefined') {
    canvasGetContextDescriptor = Object.getOwnPropertyDescriptor(
      window.HTMLCanvasElement.prototype,
      'getContext',
    );

    canvasToDataURLDescriptor = Object.getOwnPropertyDescriptor(
      window.HTMLCanvasElement.prototype,
      'toDataURL',
    );
    const getContextMock = jest
      .fn(() => createMockCanvasContext())
      .mockName('canvas-getContext');

    Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      writable: true,
      value: getContextMock as unknown as typeof window.HTMLCanvasElement.prototype.getContext,
    });

    const toDataURLMock = jest.fn(() => '').mockName('canvas-toDataURL');

    Object.defineProperty(window.HTMLCanvasElement.prototype, 'toDataURL', {
      configurable: true,
      writable: true,
      value: toDataURLMock as unknown as typeof window.HTMLCanvasElement.prototype.toDataURL,
    });
  }

  if (typeof window.getComputedStyle === 'function') {
    originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = ((elt: Element, pseudoElt?: string | null) =>
      pseudoElt
        ? originalGetComputedStyle!.call(window, elt)
        : originalGetComputedStyle!.call(window, elt, pseudoElt)) as typeof window.getComputedStyle;
  }
});

jest.mock('../services/ingestWizard', () => ({
  analyzeSample: jest.fn(),
  dryRunTransform: jest.fn(),
  checkLicense: jest.fn(),
  fetchMetadata: jest.fn(),
}));

const ingestServices = jest.requireMock('../services/ingestWizard');

const metadataResponse = {
  entities: [
    {
      id: 'person',
      label: 'Person',
      description: 'Canonical person entity capturing individuals',
      requiredFields: ['person.fullName'],
    },
  ],
  redactionPresets: [
    { id: 'mask', label: 'Mask characters', description: 'Mask characters' },
    { id: 'hash', label: 'Deterministic hash', description: 'Hash value' },
  ],
  licenses: [
    { id: 'internal-research', label: 'Internal Research Only', notes: 'Restricted to internal usage.' },
    { id: 'partner-data-share', label: 'Partner Data Share', notes: 'Allows restricted PII with safeguards.' },
  ],
};

const sampleAnalysis = {
  entity: {
    id: 'person',
    label: 'Person',
    description: 'Canonical person entity',
    fields: [
      {
        id: 'person.fullName',
        label: 'Full Name',
        description: 'Person full name',
        type: 'string',
        required: true,
      },
      {
        id: 'person.email',
        label: 'Email',
        description: 'Primary email',
        type: 'string',
      },
    ],
  },
  samplePreview: [
    { full_name: 'Alice Doe', email: 'alice@example.com' },
    { full_name: 'Bob Roe', email: 'bob@example.com' },
  ],
  totalRows: 2,
  fieldAnalyses: [
    {
      sourceField: 'full_name',
      inferredType: 'string',
      confidence: 0.9,
      sampleValues: ['Alice Doe', 'Bob Roe'],
      recommendedCanonical: 'person.fullName',
      pii: null,
      blocked: false,
      blockedReasons: [],
      lineage: { sourceField: 'full_name', transforms: [], policyTags: [] },
    },
    {
      sourceField: 'email',
      inferredType: 'string',
      confidence: 0.9,
      sampleValues: ['alice@example.com', 'bob@example.com'],
      recommendedCanonical: 'person.email',
      pii: {
        field: 'email',
        severity: 'moderate',
        reasons: ['Sample value matches email pattern'],
        category: 'contact',
        blocked: false,
        presets: [
          { id: 'mask', label: 'Mask characters', description: 'Mask characters' },
          { id: 'hash', label: 'Deterministic hash', description: 'Hash value' },
        ],
      },
      blocked: false,
      blockedReasons: [],
      lineage: { sourceField: 'email', transforms: [], policyTags: [] },
    },
  ],
  suggestedMappings: {
    'person.fullName': 'full_name',
    'person.email': 'email',
  },
  requiredFieldIssues: [],
  piiFlags: [
    {
      field: 'email',
      severity: 'moderate',
      reasons: ['Sample value matches email pattern'],
      category: 'contact',
      blocked: false,
      presets: [
        { id: 'mask', label: 'Mask characters', description: 'Mask characters' },
        { id: 'hash', label: 'Deterministic hash', description: 'Hash value' },
      ],
    },
  ],
  redactionPresets: [
    { id: 'mask', label: 'Mask characters', description: 'Mask characters' },
    { id: 'hash', label: 'Deterministic hash', description: 'Hash value' },
  ],
  estimatedCompletionMinutes: 5,
  licenses: metadataResponse.licenses,
  coverage: {
    required: {
      total: 1,
      satisfied: 1,
      missing: [],
    },
    mappedFields: 2,
    totalFields: 2,
  },
  confidenceScore: 0.9,
  warnings: ['Data quality: Restricted PII detected in 1 field requiring redaction.'],
  mappingConfidence: { high: 2, medium: 0, low: 0 },
  unmappedSourceFields: [{ field: 'notes', reason: 'No close canonical match detected' }],
  dataQuality: {
    rowCount: 2,
    averageCompleteness: 0.85,
    emptyFieldRatios: [
      { field: 'full_name', emptyPercentage: 0 },
      { field: 'email', emptyPercentage: 0 },
      { field: 'notes', emptyPercentage: 100 },
    ],
    issues: ['Restricted PII detected in 1 field requiring redaction.'],
  },
  analysisDurationMs: 125,
};

beforeEach(() => {
  jest.clearAllMocks();
  ingestServices.analyzeSample.mockResolvedValue(sampleAnalysis);
  ingestServices.dryRunTransform.mockResolvedValue({
    spec: {
      version: '1.0',
      createdAt: new Date().toISOString(),
      format: 'csv',
      entity: 'person',
      fields: [],
      policies: { license: 'partner-data-share (Partner Data Share)' },
      notes: { requiredFieldIssues: [], warnings: [] },
    },
    previewRows: [],
  });
  ingestServices.checkLicense.mockResolvedValue({
    allowed: true,
    issues: [],
    license: { id: 'partner-data-share', label: 'Partner Data Share', notes: '' },
  });
  ingestServices.fetchMetadata.mockResolvedValue(metadataResponse);

  class MockFileReader {
    public result: string | null = null;
    public onload: ((event: { target: { result: string } }) => void) | null = null;

    readAsText() {
      this.result = 'full_name,email\nAlice Doe,alice@example.com';
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }
  }

  // @ts-expect-error override for tests
  global.FileReader = MockFileReader;
});

afterAll(() => {
  if (typeof window.HTMLCanvasElement !== 'undefined') {
    if (canvasGetContextDescriptor) {
      Object.defineProperty(
        window.HTMLCanvasElement.prototype,
        'getContext',
        canvasGetContextDescriptor,
      );
    } else {
      delete (window.HTMLCanvasElement.prototype as {
        getContext?: typeof window.HTMLCanvasElement.prototype.getContext;
      }).getContext;
    }

    if (canvasToDataURLDescriptor) {
      Object.defineProperty(
        window.HTMLCanvasElement.prototype,
        'toDataURL',
        canvasToDataURLDescriptor,
      );
    } else {
      delete (window.HTMLCanvasElement.prototype as {
        toDataURL?: typeof window.HTMLCanvasElement.prototype.toDataURL;
      }).toDataURL;
    }
  }

  if (originalGetComputedStyle) {
    window.getComputedStyle = originalGetComputedStyle;
  }

  jest.restoreAllMocks();
});

const { render } = testingLibrary;
const fireEvent = (testingLibrary as any).fireEvent;
const waitFor = (testingLibrary as any).waitFor;
const screen = (testingLibrary as any).screen;

test('renders ingest wizard after analysis and matches snapshot', async () => {
  const { container, getByText, asFragment } = render(<IngestWizard />);

  await waitFor(() => expect(ingestServices.fetchMetadata).toHaveBeenCalled());

  const upload = screen.getByLabelText(/Upload or paste sample/i) as HTMLInputElement;
  const file = new File(['full_name,email\nAlice'], 'sample.csv', { type: 'text/csv' });
  fireEvent.change(upload, { target: { files: [file] } });

  fireEvent.click(getByText('Analyze sample'));

  await waitFor(() => expect(ingestServices.analyzeSample).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByText('Canonical field')).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText(/Restricted PII detected/i)).toBeInTheDocument());

  expect(asFragment()).toMatchSnapshot();

  axe.configure({
    rules: [
      {
        id: 'color-contrast',
        enabled: false,
      },
    ],
  });

  const runAxe = (axe as unknown as { run: (context: unknown, options: unknown) => Promise<any> }).run;
  const results = await runAxe(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa'],
    },
  });

  expect(results.violations).toHaveLength(0);
});

test('executes license check and dry-run with selected license', async () => {
  const { getByText } = render(<IngestWizard />);

  await waitFor(() => expect(ingestServices.fetchMetadata).toHaveBeenCalled());

  const upload = screen.getByLabelText(/Upload or paste sample/i) as HTMLInputElement;
  const file = new File(['full_name,email\nAlice'], 'sample.csv', { type: 'text/csv' });
  fireEvent.change(upload, { target: { files: [file] } });

  fireEvent.click(getByText('Analyze sample'));
  await waitFor(() => expect(ingestServices.analyzeSample).toHaveBeenCalled());

  // Advance to PII step
  fireEvent.click(getByText('Continue'));
  await waitFor(() => expect(screen.getByText('PII guard')).toBeInTheDocument());
  fireEvent.click(getByText('Continue'));
  await waitFor(() => expect(screen.getByText('Select a license')).toBeInTheDocument());

  // License step
  const licenseOption = screen.getByRole('radio', { name: /Partner Data Share/i });
  fireEvent.click(licenseOption);
  const termsCheckbox = screen.getByLabelText(
    'I confirm the license terms and certify the ingest complies with policy.',
  );
  fireEvent.click(termsCheckbox);

  fireEvent.click(getByText('Continue'));

  await waitFor(() => expect(ingestServices.checkLicense).toHaveBeenCalledWith({
    licenseId: 'partner-data-share',
    accepted: true,
    piiFlags: sampleAnalysis.piiFlags,
  }));

  await waitFor(() =>
    expect(ingestServices.dryRunTransform).toHaveBeenCalledWith(
      expect.objectContaining({ licenseId: 'partner-data-share' }),
    ),
  );
});

test('supports manual JSON sample entry', async () => {
  const { getByText } = render(<IngestWizard />);

  await waitFor(() => expect(ingestServices.fetchMetadata).toHaveBeenCalled());

  fireEvent.click(screen.getByRole('button', { name: /Paste sample/i }));

  const formatSelect = screen.getByLabelText('Format');
  fireEvent.change(formatSelect, { target: { value: 'json' } });

  const textarea = screen.getByLabelText(/Upload or paste sample/i) as HTMLTextAreaElement;
  const manualJson = '[{"full_name":"Alice","email":"alice@example.com"}]';
  fireEvent.change(textarea, { target: { value: manualJson } });

  fireEvent.click(getByText('Analyze sample'));

  await waitFor(() =>
    expect(ingestServices.analyzeSample).toHaveBeenCalledWith({
      sample: manualJson,
      format: 'json',
      entityId: 'person',
    }),
  );
});

test('enforces unique source mappings when remapping canonical fields', async () => {
  const { getByText } = render(<IngestWizard />);

  await waitFor(() => expect(ingestServices.fetchMetadata).toHaveBeenCalled());

  const upload = screen.getByLabelText(/Upload or paste sample/i) as HTMLInputElement;
  const file = new File(['full_name,email\nAlice'], 'sample.csv', { type: 'text/csv' });
  fireEvent.change(upload, { target: { files: [file] } });

  fireEvent.click(getByText('Analyze sample'));

  await waitFor(() => expect(screen.getByLabelText('Map Full Name')).toBeInTheDocument());

  const fullNameSelect = screen.getByLabelText('Map Full Name') as HTMLSelectElement;
  fireEvent.change(fullNameSelect, { target: { value: 'email' } });

  await waitFor(() => expect((screen.getByLabelText('Map Email') as HTMLSelectElement).value).toBe(''));
});

test('reapplies assistant suggestions after clearing mappings', async () => {
  const { getByText } = render(<IngestWizard />);

  await waitFor(() => expect(ingestServices.fetchMetadata).toHaveBeenCalled());

  const upload = screen.getByLabelText(/Upload or paste sample/i) as HTMLInputElement;
  const file = new File(['full_name,email\nAlice'], 'sample.csv', { type: 'text/csv' });
  fireEvent.change(upload, { target: { files: [file] } });

  fireEvent.click(getByText('Analyze sample'));
  await waitFor(() => expect(screen.getByLabelText('Map Full Name')).toBeInTheDocument());

  fireEvent.click(getByText('Clear current mappings'));
  await waitFor(() => expect((screen.getByLabelText('Map Full Name') as HTMLSelectElement).value).toBe(''));

  fireEvent.click(getByText('Reapply assistant suggestions'));
  await waitFor(() => expect((screen.getByLabelText('Map Full Name') as HTMLSelectElement).value).toBe('full_name'));
  expect((screen.getByLabelText('Map Email') as HTMLSelectElement).value).toBe('email');
});
