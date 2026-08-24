import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../src/PinchWorkflowStudio.jsx';

afterEach(() => { cleanup(); history.pushState({}, '', '/'); });

describe('TraceNLI web product', () => {
  test('renders the non-chat verification workspace and required navigation', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'New Verification' })).toBeTruthy();
    ['Run history', 'Source packs', 'Evaluation Lab', 'Receipts', 'Settings'].forEach((name) => expect(screen.getByRole('link', { name })).toBeTruthy());
    expect(screen.getByText(/Evidence, not truth/i)).toBeTruthy();
  });

  test('executes decomposition, span validation, two independent verifiers, consensus and receipt', async () => {
    render(<App />); fireEvent.click(screen.getByRole('button', { name: /Begin verification/i }));
    await waitFor(() => expect(screen.getByText('Semantic verifier A')).toBeTruthy());
    expect(screen.getByText('LLM semantic verifier B')).toBeTruthy();
    expect(screen.getByText('DETERMINISTIC CONSENSUS')).toBeTruthy();
    expect(document.body.textContent).toContain('offsets');
  });

  test('all primary routes render', () => {
    render(<App />);
    for (const name of ['Run history', 'Source packs', 'Evaluation Lab', 'Receipts', 'Settings']) {
      fireEvent.click(screen.getByRole('link', { name }));
      expect(screen.getByRole('heading', { name })).toBeTruthy();
    }
  });
});
