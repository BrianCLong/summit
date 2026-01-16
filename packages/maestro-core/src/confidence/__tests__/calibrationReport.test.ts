import {
  buildCalibrationReport,
  renderCalibrationMarkdown,
} from '../calibrationReport.js';

describe('calibration report', () => {
  it('renders deterministic markdown snapshot', () => {
    const report = buildCalibrationReport(new Date('2026-01-14T00:00:00Z'));
    const markdown = renderCalibrationMarkdown(report);

    expect(markdown).toMatchSnapshot();
  });
});
