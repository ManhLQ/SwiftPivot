import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PasteJsonModal from './PasteJsonModal.jsx';

describe('PasteJsonModal', () => {
  it('renders textarea, data path input, and submit button', () => {
    render(<PasteJsonModal onLoaded={() => {}} onClose={() => {}} />);
    expect(screen.getByLabelText(/Paste JSON/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data Path/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Load JSON/i })).toBeInTheDocument();
  });

  it('validates and loads valid JSON array', () => {
    const handleLoaded = vi.fn();
    render(<PasteJsonModal onLoaded={handleLoaded} onClose={() => {}} />);

    const textarea = screen.getByLabelText(/Paste JSON/i);
    fireEvent.change(textarea, { target: { value: '[{"a": 1}]' } });
    fireEvent.click(screen.getByRole('button', { name: /Load JSON/i }));

    expect(handleLoaded).toHaveBeenCalledWith([{ a: 1 }]);
  });

  it('handles nested dataPath like "result.data"', () => {
    const handleLoaded = vi.fn();
    render(<PasteJsonModal onLoaded={handleLoaded} onClose={() => {}} />);

    const textarea = screen.getByLabelText(/Paste JSON/i);
    const pathInput = screen.getByLabelText(/Data Path/i);

    fireEvent.change(textarea, { target: { value: '{"result":{"data":[{"x": 10}]}}' } });
    fireEvent.change(pathInput, { target: { value: 'result.data' } });
    fireEvent.click(screen.getByRole('button', { name: /Load JSON/i }));

    expect(handleLoaded).toHaveBeenCalledWith([{ x: 10 }]);
  });

  it('displays validation error for malformed JSON', () => {
    render(<PasteJsonModal onLoaded={() => {}} onClose={() => {}} />);

    const textarea = screen.getByLabelText(/Paste JSON/i);
    fireEvent.change(textarea, { target: { value: 'invalid json text' } });
    fireEvent.click(screen.getByRole('button', { name: /Load JSON/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Invalid JSON format/i);
  });
});
