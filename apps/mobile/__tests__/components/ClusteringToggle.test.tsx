import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ClusteringToggle } from '../../src/components/geoint/ClusteringToggle';

describe('ClusteringToggle', () => {
  it('renders toggle and triggers handler when enabled', () => {
    const onToggle = jest.fn();

    const { getByLabelText, getByText } = render(
      <ClusteringToggle enabled featureFlagEnabled onToggle={onToggle} />,
    );

    expect(getByText('Clustering')).toBeTruthy();

    fireEvent.press(getByLabelText('Toggle clustering'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does not render when feature flag disabled', () => {
    const { queryByText } = render(
      <ClusteringToggle enabled={false} featureFlagEnabled={false} onToggle={jest.fn()} />,
    );

    expect(queryByText('Clustering')).toBeNull();
  });
});
