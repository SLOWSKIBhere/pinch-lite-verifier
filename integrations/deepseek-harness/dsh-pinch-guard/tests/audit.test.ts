import assert from 'node:assert/strict'
import test from 'node:test'
import { recordPinchAudit } from '../src/audit.ts'
import type { PinchAuditRecordedData } from '../src/events.ts'

function baseAudit(overrides: Partial<PinchAuditRecordedData> = {}): PinchAuditRecordedData {
  return {
    version: 1,
    auditId: 'audit-1',
    runId: 'run-1',
    intentDigest: 'sha256:intent-1',
    status: 'PASS',
    auditor: 'pinch-adversarial-audit',
    evidence: ['diff inspected', 'test observed'],
    scopeLimits: ['external network effects not audited'],
    callId: 'call-1',
    receiptId: 'receipt-1',
    ...overrides,
  }
}

function fakeAgent() {
  const events: { type: string; data: unknown }[] = []
  return {
    events,
    agent: {
      session: {
        append(type: 'pinch/audit-recorded', data: PinchAuditRecordedData) {
          events.push({ type, data })
        },
      },
    },
  }
}

test('trusted audit helper appends one durable audit record', () => {
  const { agent, events } = fakeAgent()
  recordPinchAudit(agent, baseAudit())
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'pinch/audit-recorded')
  assert.equal((events[0].data as PinchAuditRecordedData).status, 'PASS')
})

test('audit PASS without observed evidence is rejected', () => {
  const { agent } = fakeAgent()
  assert.throws(
    () => recordPinchAudit(agent, baseAudit({ evidence: [] })),
    /PASS requires at least one observed evidence item/,
  )
})

test('UNAVAILABLE audit may record scope without fabricating evidence', () => {
  const { agent, events } = fakeAgent()
  recordPinchAudit(agent, baseAudit({ status: 'UNAVAILABLE', evidence: [] }))
  assert.equal((events[0].data as PinchAuditRecordedData).status, 'UNAVAILABLE')
})
