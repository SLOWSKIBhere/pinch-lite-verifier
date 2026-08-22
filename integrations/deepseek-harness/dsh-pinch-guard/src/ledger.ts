import type { PinchAuditRecordedData, PinchAuthorityAdmittedData } from './events.ts'

export interface DurableEventLike {
  readonly type: string
  readonly data: unknown
}

export interface PinchReplaySummary {
  readonly authorities: number
  readonly completedAuthorizedCalls: number
  readonly audits: number
  readonly openAuthorizedCalls: readonly string[]
}

interface AuthorityTrace {
  readonly data: PinchAuthorityAdmittedData
  resultObserved: boolean
}

function record(data: unknown, type: string): Record<string, unknown> {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${type} data must be a JSON object`)
  }
  return data as Record<string, unknown>
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new Error(`${label} must be a positive safe integer`)
  }
  return value as number
}

function authorityData(value: unknown): PinchAuthorityAdmittedData {
  const data = record(value, 'pinch/authority-admitted')
  if (data.version !== 1) throw new Error('pinch/authority-admitted version must be 1')
  const evidenceCount = positiveInteger(data.evidenceCount, 'evidenceCount')
  const callOrdinal = positiveInteger(data.callOrdinal, 'callOrdinal')
  const digest = requiredString(data.evidenceDigest, 'evidenceDigest')
  if (!/^sha256:[0-9a-f]{64}$/i.test(digest)) throw new Error('evidenceDigest must be sha256:<64 hex>')
  if (data.targetPath !== undefined) requiredString(data.targetPath, 'targetPath')
  return {
    version: 1,
    runId: requiredString(data.runId, 'runId'),
    intentDigest: requiredString(data.intentDigest, 'intentDigest'),
    receiptId: requiredString(data.receiptId, 'receiptId'),
    callId: requiredString(data.callId, 'callId'),
    toolName: requiredString(data.toolName, 'toolName'),
    verifier: requiredString(data.verifier, 'verifier'),
    evidenceCount,
    evidenceDigest: digest,
    expiresAt: requiredString(data.expiresAt, 'expiresAt'),
    callOrdinal,
    ...(data.targetPath === undefined ? {} : { targetPath: data.targetPath as string }),
  }
}

function auditData(value: unknown): PinchAuditRecordedData {
  const data = record(value, 'pinch/audit-recorded')
  if (data.version !== 1) throw new Error('pinch/audit-recorded version must be 1')
  if (!['PASS', 'FAIL', 'UNAVAILABLE', 'UNRESOLVED'].includes(String(data.status))) {
    throw new Error(`invalid audit status ${String(data.status)}`)
  }
  const evidence = data.evidence
  const scopeLimits = data.scopeLimits
  if (!Array.isArray(evidence) || evidence.some(item => typeof item !== 'string' || item.trim().length === 0)) {
    throw new Error('audit evidence must be non-empty strings')
  }
  if (!Array.isArray(scopeLimits) || scopeLimits.some(item => typeof item !== 'string' || item.trim().length === 0)) {
    throw new Error('audit scopeLimits must be non-empty strings')
  }
  if (data.status === 'PASS' && evidence.length === 0) throw new Error('audit PASS requires evidence')
  return {
    version: 1,
    auditId: requiredString(data.auditId, 'auditId'),
    runId: requiredString(data.runId, 'runId'),
    intentDigest: requiredString(data.intentDigest, 'intentDigest'),
    status: data.status as PinchAuditRecordedData['status'],
    auditor: requiredString(data.auditor, 'auditor'),
    evidence: evidence as string[],
    scopeLimits: scopeLimits as string[],
    ...(data.callId === undefined ? {} : { callId: requiredString(data.callId, 'callId') }),
    ...(data.receiptId === undefined ? {} : { receiptId: requiredString(data.receiptId, 'receiptId') }),
    ...(data.claimDigest === undefined ? {} : { claimDigest: requiredString(data.claimDigest, 'claimDigest') }),
  }
}

/**
 * Replay and validate the PINCH durable protocol against ordinary Harness
 * `tool/call` and `tool/result` events. Open authorized calls at the log tail
 * are treated as interruption evidence, not corruption.
 */
export function validatePinchReplay(events: readonly DurableEventLike[]): PinchReplaySummary {
  const toolCalls = new Map<string, string>()
  const authorities = new Map<string, AuthorityTrace>()
  const audits = new Set<string>()
  let completedAuthorizedCalls = 0

  for (const event of events) {
    if (event.type === 'tool/call') {
      const data = record(event.data, event.type)
      const callId = requiredString(data.callId, 'tool/call callId')
      const name = requiredString(data.name, 'tool/call name')
      if (toolCalls.has(callId)) throw new Error(`duplicate tool/call ${callId}`)
      toolCalls.set(callId, name)
      continue
    }

    if (event.type === 'pinch/authority-admitted') {
      const data = authorityData(event.data)
      const toolName = toolCalls.get(data.callId)
      if (toolName === undefined) throw new Error(`authority ${data.callId} has no prior tool/call`)
      if (toolName !== data.toolName) throw new Error(`authority tool mismatch for ${data.callId}`)
      if (authorities.has(data.callId)) throw new Error(`duplicate authority for ${data.callId}`)
      authorities.set(data.callId, { data, resultObserved: false })
      continue
    }

    if (event.type === 'tool/result') {
      const data = record(event.data, event.type)
      const callId = data.message && typeof data.message === 'object'
        ? requiredString((data.message as Record<string, unknown>).callId, 'tool/result message.callId')
        : requiredString(data.callId, 'tool/result callId')
      const trace = authorities.get(callId)
      if (trace !== undefined && !trace.resultObserved) {
        trace.resultObserved = true
        completedAuthorizedCalls++
      }
      continue
    }

    if (event.type === 'pinch/audit-recorded') {
      const data = auditData(event.data)
      if (audits.has(data.auditId)) throw new Error(`duplicate audit ${data.auditId}`)
      audits.add(data.auditId)
      if (data.callId !== undefined) {
        const trace = authorities.get(data.callId)
        if (trace === undefined) throw new Error(`audit ${data.auditId} references unauthorised call ${data.callId}`)
        if (!trace.resultObserved) throw new Error(`audit ${data.auditId} precedes tool/result for ${data.callId}`)
        if (data.runId !== trace.data.runId || data.intentDigest !== trace.data.intentDigest) {
          throw new Error(`audit ${data.auditId} execution identity does not match authority`)
        }
        if (data.receiptId !== undefined && data.receiptId !== trace.data.receiptId) {
          throw new Error(`audit ${data.auditId} receipt does not match authority`)
        }
      }
    }
  }

  return {
    authorities: authorities.size,
    completedAuthorizedCalls,
    audits: audits.size,
    openAuthorizedCalls: [...authorities]
      .filter(([, trace]) => !trace.resultObserved)
      .map(([callId]) => callId),
  }
}
