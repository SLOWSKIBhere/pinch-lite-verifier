import type { PinchAuditRecordedData } from './events.ts'
import type {} from './events.ts'

/** Minimal structural face of a live agent needed to append a durable audit. */
export interface PinchAuditAgent {
  readonly session: {
    append(type: 'pinch/audit-recorded', data: PinchAuditRecordedData): unknown
  }
}

function nonEmpty(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`pinch-audit: ${label} must be a non-empty string`)
  }
}

/**
 * Append a trusted audit record to the agent's canonical Session log.
 *
 * This helper intentionally does not expose a model-facing tool. The caller is
 * expected to be a trusted controller/auditor that already owns the audit
 * result. Recording an audit never grants authority for another mutation.
 */
export function recordPinchAudit(agent: PinchAuditAgent, record: PinchAuditRecordedData): void {
  if (record.version !== 1) throw new Error('pinch-audit: unsupported record version')
  nonEmpty(record.auditId, 'auditId')
  nonEmpty(record.runId, 'runId')
  nonEmpty(record.intentDigest, 'intentDigest')
  nonEmpty(record.auditor, 'auditor')
  if (!['PASS', 'FAIL', 'UNAVAILABLE', 'UNRESOLVED'].includes(record.status)) {
    throw new Error(`pinch-audit: invalid status ${String(record.status)}`)
  }
  if (!Array.isArray(record.evidence) || record.evidence.some(item => typeof item !== 'string' || item.trim().length === 0)) {
    throw new Error('pinch-audit: evidence must contain only non-empty strings')
  }
  if (!Array.isArray(record.scopeLimits) || record.scopeLimits.some(item => typeof item !== 'string' || item.trim().length === 0)) {
    throw new Error('pinch-audit: scopeLimits must contain only non-empty strings')
  }
  if (record.status === 'PASS' && record.evidence.length === 0) {
    throw new Error('pinch-audit: PASS requires at least one observed evidence item')
  }
  if (record.callId !== undefined) nonEmpty(record.callId, 'callId')
  if (record.receiptId !== undefined) nonEmpty(record.receiptId, 'receiptId')
  if (record.claimDigest !== undefined) nonEmpty(record.claimDigest, 'claimDigest')

  agent.session.append('pinch/audit-recorded', record)
}
