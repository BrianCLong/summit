const React = require('react');
const { render, screen, waitFor, fireEvent, within } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event').default;
const { PIIScanner } = require('../SecurityDashboard');
const { PIIDetectionAPI } = require('../../../services/security-api');
const { act } = require('react-dom/test-utils');

describe('PIIScanner sensitive context gating', () => {
  it('prompts for context when missing and retries request', async () => {
    const user = userEvent.setup();
    const scanMock = jest.spyOn(PIIDetectionAPI, 'scan');
    scanMock.mockResolvedValueOnce({
      data: { detections: [], riskScore: 0, recommendations: [] },
      accessContext: {
        purpose: 'investigation',
        justification: 'fraud triage',
        caseId: 'CASE-9',
      },
    });

    render(React.createElement(PIIScanner));

    const input = screen.getByPlaceholderText(/john@example.com/i);
    fireEvent.change(input, { target: { value: '{"email":"user@example.com"}' } });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /scan for pii/i }));
    });

    await waitFor(() => expect(scanMock).not.toHaveBeenCalled());
    const dialog = await screen.findByTestId('sensitive-context-dialog');
    const dialogQueries = within(dialog);

    expect(dialogQueries.getByLabelText(/purpose/i, { selector: 'input', hidden: true })).toBeInTheDocument();
    expect(dialogQueries.getByLabelText(/justification/i, { selector: 'textarea', hidden: true })).toBeInTheDocument();
    expect(dialogQueries.getByLabelText(/case id/i, { selector: 'input', hidden: true })).toBeInTheDocument();

    expect(scanMock).not.toHaveBeenCalled();
  });
});
