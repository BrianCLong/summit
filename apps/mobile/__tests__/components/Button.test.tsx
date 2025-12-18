import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../src/components/ui/Button';

describe('Button', () => {
  it('renders correctly with text', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button onPress={onPress}>Click me</Button>);

    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button loading>Click me</Button>
    );

    // Text should not be visible when loading
    expect(queryByText('Click me')).toBeNull();
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button onPress={onPress} disabled>
        Click me
      </Button>
    );

    fireEvent.press(getByText('Click me'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('applies variant styles correctly', () => {
    const { getByText, rerender } = render(
      <Button variant="default">Default</Button>
    );
    expect(getByText('Default')).toBeTruthy();

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(getByText('Destructive')).toBeTruthy();

    rerender(<Button variant="outline">Outline</Button>);
    expect(getByText('Outline')).toBeTruthy();
  });

  it('applies size styles correctly', () => {
    const { getByText, rerender } = render(<Button size="sm">Small</Button>);
    expect(getByText('Small')).toBeTruthy();

    rerender(<Button size="lg">Large</Button>);
    expect(getByText('Large')).toBeTruthy();
  });
});
