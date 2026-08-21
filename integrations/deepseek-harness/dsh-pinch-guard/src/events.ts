/** Durable PINCH event vocabulary for DeepSeek Harness session replay. */

export type PinchAuditStatus = 'PASS' | 'FAIL' | 'UNAVAILABLE' | 'UNRESOLVED'

/**
 * Durable proof that a protected tool call crossed the PINCH authorization
 * boundary under a particular verified receipt. This does not claim the tool
 * executed or that its intended effect occurred; the ordinary durable
 * `tool/result` event remains the execution outcome.
 */
export interface PinchAuthorityAdmittedData {
  readonly version: 1
  readonly runId: string
  readonly intentDigest: string
  readonly receiptId: string
  readonly callId: string
  readonly toolName: string
  readonly verifier: string
  readonly evidenceCount: number
  readonly evidenceDigest: string
  readonly expiresAt: string
  readonly callOrdinal: number
  readonly targetPath?: string
}

/**
 * Durable postcondition/audit record produced by a trusted auditor or
 * controller after observing the actual execution history. An audit is not an
 * authorization and cannot retroactively make an unverified action valid.
 */
export interface PinchAuditRecordedData {
  readonly version: 1
  readonly auditId: string
  readonly runId: string
  readonly intentDigest: string
  readonly status: PinchAuditStatus
  readonly auditor: string
  readonly evidence: readonly string[]
  readonly scopeLimits: readonly string[]
  readonly callId?: string
  readonly receiptId?: string
  readonly claimDigest?: string
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** A protected call passed verified, run-bound, intent-bound authority. */
    'pinch/authority-admitted': PinchAuthorityAdmittedData
    /** A trusted postcondition or claim audit was recorded after observation. */
    'pinch/audit-recorded': PinchAuditRecordedData
  }
}
