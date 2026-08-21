import { isAbsolute, relative, resolve } from 'node:path'

export type VerificationStatus = 'PASS' | 'FAIL' | 'WITHDRAW' | 'UNAVAILABLE' | 'UNRESOLVED'

export interface AuthorityReceipt {
  version: 1
  receiptId: string
  runId: string
  intentDigest: string
  issuedAt: string
  expiresAt: string
  verification: {
    status: VerificationStatus
    verifier: string
    evidence: string[]
  }
  allowedTools: string[]
  pathPrefixes?: string[]
  allowUnscopedTools?: string[]
  maxCalls: number
}

export interface AuthorityExecution {
  runId: string
  intentDigest: string
  toolName: string
  arguments: unknown
  cwd: string
  callsUsed: number
  now?: Date
}

export interface AuthorityPolicyOptions {
  minimumEvidenceItems?: number
  pathKeys?: string[]
}

export interface AuthorityDecision {
  allowed: boolean
  code: string
  reason: string
  resolvedPath?: string
}

const DEFAULT_PATH_KEYS = ['path', 'file_path', 'target_path']

function deny(code: string, reason: string, resolvedPath?: string): AuthorityDecision {
  return { allowed: false, code, reason, ...(resolvedPath ? { resolvedPath } : {}) }
}

function allow(resolvedPath?: string): AuthorityDecision {
  return {
    allowed: true,
    code: 'AUTHORITY_OK',
    reason: 'Verified authority receipt matches this execution.',
    ...(resolvedPath ? { resolvedPath } : {}),
  }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonEmptyString)
}

function parseTime(value: string): number | undefined {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function extractPath(argumentsValue: unknown, pathKeys: string[]): string | undefined {
  if (argumentsValue === null || typeof argumentsValue !== 'object' || Array.isArray(argumentsValue)) return undefined
  const record = argumentsValue as Record<string, unknown>
  for (const key of pathKeys) {
    const value = record[key]
    if (nonEmptyString(value)) return value
  }
  return undefined
}

function isWithinPrefix(candidate: string, prefix: string): boolean {
  const rel = relative(prefix, candidate)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

export function evaluateAuthority(
  receipt: AuthorityReceipt,
  execution: AuthorityExecution,
  options: AuthorityPolicyOptions = {},
): AuthorityDecision {
  const minimumEvidenceItems = options.minimumEvidenceItems ?? 2
  const pathKeys = options.pathKeys ?? DEFAULT_PATH_KEYS

  if (receipt === null || typeof receipt !== 'object') {
    return deny('INVALID_RECEIPT', 'Authority receipt is not an object.')
  }
  if (receipt.version !== 1) {
    return deny('UNSUPPORTED_RECEIPT_VERSION', 'Authority receipt version is unsupported.')
  }
  if (!nonEmptyString(receipt.receiptId)) {
    return deny('INVALID_RECEIPT_ID', 'Authority receipt id is missing.')
  }
  if (!nonEmptyString(receipt.runId) || receipt.runId !== execution.runId) {
    return deny('STALE_RUN', 'Authority receipt is not bound to the current run.')
  }
  if (!nonEmptyString(receipt.intentDigest) || receipt.intentDigest !== execution.intentDigest) {
    return deny('CHANGED_INTENT', 'Authority receipt is not bound to the current intent digest.')
  }

  if (!receipt.verification || receipt.verification.status !== 'PASS') {
    return deny('VERIFICATION_NOT_PASS', 'Only an explicit verifier PASS may authorize mutation.')
  }
  if (!nonEmptyString(receipt.verification.verifier)) {
    return deny('INVALID_VERIFIER', 'Verifier identity is missing from the authority receipt.')
  }
  if (!stringArray(receipt.verification.evidence) || receipt.verification.evidence.length < minimumEvidenceItems) {
    return deny(
      'INSUFFICIENT_EVIDENCE',
      `Authority requires at least ${minimumEvidenceItems} non-empty evidence items.`,
    )
  }

  if (!nonEmptyString(receipt.issuedAt) || parseTime(receipt.issuedAt) === undefined) {
    return deny('INVALID_ISSUED_AT', 'Authority receipt issuedAt is invalid.')
  }
  const expiresAt = nonEmptyString(receipt.expiresAt) ? parseTime(receipt.expiresAt) : undefined
  if (expiresAt === undefined) {
    return deny('INVALID_EXPIRY', 'Authority receipt expiresAt is invalid.')
  }
  const now = (execution.now ?? new Date()).getTime()
  if (now >= expiresAt) {
    return deny('EXPIRED_AUTHORITY', 'Authority receipt has expired.')
  }

  if (!Number.isInteger(receipt.maxCalls) || receipt.maxCalls < 1) {
    return deny('INVALID_CALL_BOUND', 'Authority receipt maxCalls must be a positive integer.')
  }
  if (!Number.isInteger(execution.callsUsed) || execution.callsUsed < 0) {
    return deny('INVALID_CALL_STATE', 'Current authority call count is invalid.')
  }
  if (execution.callsUsed >= receipt.maxCalls) {
    return deny('AUTHORITY_REPLAY', 'Authority receipt has exhausted its bounded call count.')
  }

  if (!stringArray(receipt.allowedTools) || !receipt.allowedTools.includes(execution.toolName)) {
    return deny('TOOL_OUT_OF_SCOPE', `Tool ${execution.toolName} is outside the authority receipt.`)
  }

  const rawPath = extractPath(execution.arguments, pathKeys)
  if (rawPath !== undefined) {
    if (!stringArray(receipt.pathPrefixes) || receipt.pathPrefixes.length === 0) {
      return deny('PATH_SCOPE_MISSING', 'Path-scoped tool call has no authorized path prefix.')
    }
    const candidate = resolve(execution.cwd, rawPath)
    const allowed = receipt.pathPrefixes.some(prefix => {
      if (!nonEmptyString(prefix)) return false
      return isWithinPrefix(candidate, resolve(execution.cwd, prefix))
    })
    if (!allowed) {
      return deny('PATH_OUT_OF_SCOPE', `Resolved path ${candidate} is outside authorized prefixes.`, candidate)
    }
    return allow(candidate)
  }

  if (!stringArray(receipt.allowUnscopedTools) || !receipt.allowUnscopedTools.includes(execution.toolName)) {
    return deny(
      'UNSCOPED_TOOL_DENIED',
      `Tool ${execution.toolName} has no path argument and is not explicitly authorized as unscoped.`,
    )
  }

  return allow()
}
