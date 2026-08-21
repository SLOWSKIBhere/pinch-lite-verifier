import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateAuthority, type AuthorityReceipt } from '../src/policy.ts'

const NOW = new Date('2026-08-20T21:00:00-04:00')

function receipt(overrides: Partial<AuthorityReceipt> = {}): AuthorityReceipt {
  return {
    version: 1,
    receiptId: 'receipt-1',
    runId: 'run-1',
    intentDigest: 'sha256:intent-a',
    issuedAt: '2026-08-20T20:55:00-04:00',
    expiresAt: '2026-08-20T21:30:00-04:00',
    verification: {
      status: 'PASS',
      verifier: 'pinch-epistemic-verifier',
      evidence: ['source inspection', 'test result'],
    },
    allowedTools: ['write', 'edit'],
    pathPrefixes: ['/repo'],
    allowUnscopedTools: [],
    maxCalls: 2,
    ...overrides,
  }
}

function execution(overrides: Partial<Parameters<typeof evaluateAuthority>[1]> = {}) {
  return {
    runId: 'run-1',
    intentDigest: 'sha256:intent-a',
    toolName: 'write',
    arguments: { path: '/repo/README.md' },
    cwd: '/repo',
    callsUsed: 0,
    now: NOW,
    ...overrides,
  }
}

test('allows a verified in-scope path mutation', () => {
  const decision = evaluateAuthority(receipt(), execution())
  assert.equal(decision.allowed, true)
  assert.equal(decision.code, 'AUTHORITY_OK')
})

test('denies a receipt from a stale run', () => {
  const decision = evaluateAuthority(receipt({ runId: 'run-old' }), execution())
  assert.equal(decision.allowed, false)
  assert.equal(decision.code, 'STALE_RUN')
})

test('denies changed intent even when the tool and path are identical', () => {
  const decision = evaluateAuthority(
    receipt({ intentDigest: 'sha256:old-intent' }),
    execution({ intentDigest: 'sha256:new-intent' }),
  )
  assert.equal(decision.allowed, false)
  assert.equal(decision.code, 'CHANGED_INTENT')
})

test('unavailable verification cannot become PASS', () => {
  const base = receipt()
  const decision = evaluateAuthority(
    receipt({ verification: { ...base.verification, status: 'UNAVAILABLE' } }),
    execution(),
  )
  assert.equal(decision.allowed, false)
  assert.equal(decision.code, 'VERIFICATION_NOT_PASS')
})

test('WITHDRAW prevents an unnecessary mutation', () => {
  const base = receipt()
  const decision = evaluateAuthority(
    receipt({ verification: { ...base.verification, status: 'WITHDRAW' } }),
    execution(),
  )
  assert.equal(decision.allowed, false)
  assert.equal(decision.code, 'VERIFICATION_NOT_PASS')
})

test('denies insufficient evidence behind high-confidence authority', () => {
  const base = receipt()
  const decision = evaluateAuthority(
    receipt({ verification: { ...base.verification, evidence: ['one observation'] } }),
    execution(),
  )
  assert.equal(decision.allowed, false)
  assert.equal(decision.code, 'INSUFFICIENT_EVIDENCE')
})

test('denies path escape outside the authorized prefix', () => {
  const decision = evaluateAuthority(
    receipt(),
    execution({ arguments: { path: '/repo/../outside/secret.txt' } }),
  )
  assert.equal(decision.allowed, false)
  assert.equal(decision.code, 'PATH_OUT_OF_SCOPE')
})

test('denies unscoped tools unless they are explicitly opted in', () => {
  const decision = evaluateAuthority(
    receipt({ allowedTools: ['bash'] }),
    execution({ toolName: 'bash', arguments: { command: 'echo hello' } }),
  )
  assert.equal(decision.allowed, false)
  assert.equal(decision.code, 'UNSCOPED_TOOL_DENIED')
})

test('permits an explicitly authorized unscoped tool', () => {
  const decision = evaluateAuthority(
    receipt({ allowedTools: ['bash'], allowUnscopedTools: ['bash'] }),
    execution({ toolName: 'bash', arguments: { command: 'echo hello' } }),
  )
  assert.equal(decision.allowed, true)
  assert.equal(decision.code, 'AUTHORITY_OK')
})

test('denies replay after bounded call count is exhausted', () => {
  const decision = evaluateAuthority(
    receipt({ maxCalls: 1 }),
    execution({ callsUsed: 1 }),
  )
  assert.equal(decision.allowed, false)
  assert.equal(decision.code, 'AUTHORITY_REPLAY')
})

test('denies expired authority', () => {
  const decision = evaluateAuthority(
    receipt({ expiresAt: '2026-08-20T20:59:59-04:00' }),
    execution(),
  )
  assert.equal(decision.allowed, false)
  assert.equal(decision.code, 'EXPIRED_AUTHORITY')
})
