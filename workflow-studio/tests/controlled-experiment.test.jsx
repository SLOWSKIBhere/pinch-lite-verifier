import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../src/PinchWorkflowStudio.jsx';

afterEach(() => cleanup());

function text() {
  return document.body.textContent || '';
}

function loadExample(label) {
  fireEvent.click(screen.getByRole('button', { name: /Load Example/i }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(label, 'i') }));
}

function openTab(label) {
  fireEvent.click(screen.getByRole('tab', { name: label }));
}

function stepUntil(predicate, limit = 40) {
  for (let index = 0; index < limit; index += 1) {
    if (predicate()) return index;
    const step = screen.getByRole('button', { name: /^Step$/i });
    if (step.disabled) return index;
    fireEvent.click(step);
  }
  throw new Error(`Condition was not reached after ${limit} deterministic steps.`);
}

function finishSimulation() {
  stepUntil(() => screen.getByRole('button', { name: /^Step$/i }).disabled);
}

function readinessPercent() {
  const label = screen.getByLabelText(/Overall readiness \d+ percent/i);
  const match = label.getAttribute('aria-label')?.match(/(\d+) percent/i);
  if (!match) throw new Error('Could not read Overall Readiness from its accessible label.');
  return Number(match[1]);
}

describe('controlled PINCH simulation experiment', () => {
  test('control condition: verified research reaches EXECUTE and Ready', () => {
    render(<App />);
    loadExample('Verified research brief');
    openTab('Simulate');
    finishSimulation();

    expect(text()).toContain('EXECUTE: All claims passed consensus');
    expect(text()).toContain('Bounded Executor ran within its authorized scope.');

    openTab('Verify');
    expect(text()).toContain('Ready');
    expect(readinessPercent()).toBeGreaterThanOrEqual(80);
  }, 15000);

  test('treatment condition: adversarial workflow blocks before execution', () => {
    render(<App />);
    loadExample('Adversarial test');
    openTab('Simulate');
    finishSimulation();

    expect(text()).toContain('BLOCK:');
    expect(text()).toContain('Bounded Executor was skipped: no authorization on record.');
    expect(text()).not.toContain('Permission Gate needs a decision');

    openTab('Verify');
    expect(text()).toContain('Blocked');
    expect(text()).toContain('Mismatch detected between the claimed result and the actual outcome.');
    expect(readinessPercent()).toBeLessThanOrEqual(35);
  }, 15000);

  test('approval condition: unresolved creative claims pause for a human decision and rejection blocks execution', () => {
    render(<App />);
    loadExample('Creative campaign workflow');
    openTab('Simulate');

    stepUntil(() => Boolean(screen.queryByRole('alertdialog', { name: /approval required/i })));
    expect(text()).toContain('REQUIRE_APPROVAL:');

    fireEvent.click(screen.getByRole('button', { name: /^Reject$/i }));
    finishSimulation();

    expect(text()).toContain('User rejected the request. Execution blocked.');
    expect(text()).toContain('Bounded Executor was skipped: no authorization on record.');
  }, 15000);
});
