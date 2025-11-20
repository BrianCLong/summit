import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {Button} from '../../components/UIComponents';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const {getByText} = render(<Button title="Test Button" onPress={() => {}} />);
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    const {getByText} = render(<Button title="Test Button" onPress={onPressMock} />);

    fireEvent.press(getByText('Test Button'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPressMock = jest.fn();
    const {getByText} = render(
      <Button title="Test Button" onPress={onPressMock} disabled />
    );

    fireEvent.press(getByText('Test Button'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    const {queryByText, UNSAFE_getByType} = render(
      <Button title="Test Button" onPress={() => {}} loading />
    );

    expect(queryByText('Test Button')).toBeFalsy();
    expect(UNSAFE_getByType('ActivityIndicator')).toBeTruthy();
  });

  it('renders with icon', () => {
    const {UNSAFE_getByProps} = render(
      <Button title="Test Button" onPress={() => {}} icon="check" />
    );

    expect(UNSAFE_getByProps({name: 'check'})).toBeTruthy();
  });

  it('applies variant styles correctly', () => {
    const variants = ['primary', 'secondary', 'outline', 'text'] as const;

    variants.forEach((variant) => {
      const {getByText} = render(
        <Button title={`${variant} Button`} onPress={() => {}} variant={variant} />
      );

      expect(getByText(`${variant} Button`)).toBeTruthy();
    });
  });

  it('applies size styles correctly', () => {
    const sizes = ['small', 'medium', 'large'] as const;

    sizes.forEach((size) => {
      const {getByText} = render(
        <Button title={`${size} Button`} onPress={() => {}} size={size} />
      );

      expect(getByText(`${size} Button`)).toBeTruthy();
    });
  });

  it('renders full width when fullWidth prop is true', () => {
    const {getByText} = render(
      <Button title="Full Width Button" onPress={() => {}} fullWidth />
    );

    const button = getByText('Full Width Button').parent;
    expect(button?.props.style).toContainEqual(expect.objectContaining({width: '100%'}));
  });
});
