import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../FileUpload';
import { MockedProvider } from '@apollo/client/testing';
import '@testing-library/jest-dom';

describe('FileUpload', () => {
  const mocks: any[] = [];

  it('renders with correct accessibility attributes', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <FileUpload />
      </MockedProvider>
    );
    const dropzone = screen.getByRole('button', { name: /file upload dropzone/i });
    expect(dropzone).toBeInTheDocument();
    expect(dropzone).toHaveAttribute('tabIndex', '0');
  });

  it('triggers file input click on Enter key', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <FileUpload />
      </MockedProvider>
    );
    const dropzone = screen.getByRole('button', { name: /file upload dropzone/i });

    const clickSpy = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.keyDown(dropzone, { key: 'Enter', code: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('triggers file input click on Space key', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <FileUpload />
      </MockedProvider>
    );
    const dropzone = screen.getByRole('button', { name: /file upload dropzone/i });

    const clickSpy = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.keyDown(dropzone, { key: ' ', code: 'Space' });
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('dropzone has correct tailwind focus classes', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <FileUpload />
      </MockedProvider>
    );
    const dropzone = screen.getByRole('button', { name: /file upload dropzone/i });
    expect(dropzone).toHaveClass('focus-visible:outline-none');
    expect(dropzone).toHaveClass('focus-visible:ring-2');
    expect(dropzone).toHaveClass('focus-visible:ring-ring');
  });
});
