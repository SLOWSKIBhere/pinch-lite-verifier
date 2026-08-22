import assert from 'node:assert/strict'
import test from 'node:test'
import { validatePinchReplay } from '../src/ledger.ts'

const authority = {
  version: 1 as const,
  runId: 'run-1',
  intentDigest: 'sha256:intent-1',
  receiptId: 'receipt-1',
  callId: 'call-1',
  toolName: 'write',
  verifier: 'pinch-epistemic-verifier',
  evidenceCount: 2,
  evidenceDigest: `sha256:${'a'.repeat(64)}`,
  expiresAt: '2026-08-21T02:00:00.000Z',
  callOrdinal: 1,
  targetPath: '/repo/file.txt',
}

const audit = {
  version: 1 as const,
  auditId: 'audit-1',
  runId: 'run-1',
  intentDigest: 'sha256:intent-1',
  status: 'PASS' as const,
  auditor: 'pinch-adversarial-audit',
  evidence: ['diff inspected', 'test passed'],
  scopeLimits: ['network effects not audited'],
  callId: 'call-1',
  receiptId: 'receipt-1',
}

function call() {
  return { type: 'tool/call', data: { callId: 'call-1', name: 'write', arguments: '{}' } }
}

function result() {
  return { type: 'tool/result', data: { message: { callId: 'call-1', content: [] } } }
}

test('replay links tool call -> authority -> result -> audit', () => {
  const summary = validatePinchReplay([
    call(),
    { type: 'pinch/authority-admitted', data: authority },
    result(),
    { type: 'pinch/audit-recorded', data: audit },
  ])
  assert.deepEqual(summary, {
    authorities: 1,
    completedAuthorizedCalls: 1,
    audits: 1,
    openAuthorizedCalls: [],
  })
})

test('authority without prior tool/call is rejected', () => {
  assert.throws(
    () => validatePinchReplay([{ type: 'pinch/authority-admitted', data: authority }]),
    /no prior tool\/call/,
  )
})

test('audit cannot precede observed tool result', () => {
  assert.throws(
    () => validatePinchReplay([
      call(),
      { type: 'pinch/authority-admitted', data: authority },
      { type: 'pinch/audit-recorded', data: audit },
    ]),
    /precedes tool\/result/,
  )
})

test('audit cannot attach to a different execution identity', () => {
  assert.throws(
    () => validatePinchReplay([
      call(),
      { type: 'pinch/authority-admitted', data: authority },
      result(),
      { type: 'pinch/audit-recorded', data: { ...audit, runId: 'run-other' } },
    ]),
    /execution identity does not match authority/,
  )
})

test('open authorized call at log tail is interruption evidence, not corruption', () => {
  const summary = validatePinchReplay([
    call(),
    { type: 'pinch/authority-admitted', data: authority },
  ])
  assert.deepEqual(summary.openAuthorizedCalls, ['call-1'])
})

test('audit PASS requires observed evidence', () => {
  assert.throws(
    () => validatePinchReplay([
      call(),
      { type: 'pinch/authority-admitted', data: authority },
      result(),
      { type: 'pinch/audit-recorded', data: { ...audit, evidence: [] } },
    ]),
    /PASS requires evidence/,
  )
})
