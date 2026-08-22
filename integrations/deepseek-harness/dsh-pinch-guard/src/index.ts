import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import { evaluateAuthority, type AuthorityReceipt } from './policy.ts'
import type {} from './events.ts'

export const name = 'pinch-guard'
export const inject = ['tools']

export interface Config {
  /** Trusted controller-owned JSON receipt path. Keep it outside model write authority. */
  receiptFile: string
  /** Side-effecting tools that must cross the PINCH gate. Default: write, edit. */
  protectedTools?: string[]
  /** Candidate argument fields that contain a path. */
  pathKeys?: string[]
  /** Minimum independent evidence items required in a verifier PASS. Default: 2. */
  minimumEvidenceItems?: number
  /** Environment variable carrying the current one-shot run id. */
  runIdEnv?: string
  /** Environment variable carrying the current one-shot intent digest. */
  intentDigestEnv?: string
  /** Optional environment variable carrying the execution cwd used for path resolution. */
  cwdEnv?: string
  /** Require protected calls to have an owning Session so authority is durably replayable. Default: true. */
  requireDurableSession?: boolean
}

function requiredEnv(name: string): string | undefined {
  const value = process.env[name]
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

async function loadReceipt(path: string): Promise<AuthorityReceipt> {
  const text = await readFile(path, 'utf8')
  return JSON.parse(text) as AuthorityReceipt
}

function digestEvidence(evidence: readonly string[]): string {
  const hex = createHash('sha256').update(JSON.stringify(evidence)).digest('hex')
  return `sha256:${hex}`
}

export function apply(ctx: Context, config: Config): void {
  if (!config || typeof config.receiptFile !== 'string' || config.receiptFile.trim().length === 0) {
    throw new Error('pinch-guard: receiptFile is required')
  }

  const protectedTools = new Set(config.protectedTools ?? ['write', 'edit'])
  if (protectedTools.size === 0) {
    throw new Error('pinch-guard: protectedTools must not be empty')
  }

  const pathKeys = config.pathKeys ?? ['path', 'file_path', 'target_path']
  const minimumEvidenceItems = config.minimumEvidenceItems ?? 2
  if (!Number.isInteger(minimumEvidenceItems) || minimumEvidenceItems < 1) {
    throw new Error('pinch-guard: minimumEvidenceItems must be a positive integer')
  }

  const runIdEnv = config.runIdEnv ?? 'PINCH_RUN_ID'
  const intentDigestEnv = config.intentDigestEnv ?? 'PINCH_INTENT_DIGEST'
  const cwdEnv = config.cwdEnv ?? 'PINCH_CWD'
  const requireDurableSession = config.requireDurableSession ?? true

  // A pre-execute PASS reserves the receipt call before downstream policy runs.
  // This is intentionally fail-closed: a later denial or rejected approval may
  // still consume one bounded call rather than make a receipt replayable.
  const callsUsed = new Map<string, number>()
  const admitted = new Set<ToolExecution['token']>()

  ctx.on('tools/pre-execute', async (exec, next): Promise<PreToolDecision> => {
    if (!protectedTools.has(exec.name)) return next()

    if (requireDurableSession && !exec.agent) {
      return {
        kind: 'deny',
        reason: 'PINCH_DENY MISSING_DURABLE_SESSION: protected autonomous-agent work must have an owning Session.',
      }
    }

    const runId = requiredEnv(runIdEnv)
    const intentDigest = requiredEnv(intentDigestEnv)
    if (!runId || !intentDigest) {
      return {
        kind: 'deny',
        reason: `PINCH_DENY MISSING_EXECUTION_IDENTITY: ${runIdEnv} and ${intentDigestEnv} must be set.`,
      }
    }

    let receipt: AuthorityReceipt
    try {
      receipt = await loadReceipt(config.receiptFile)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        kind: 'deny',
        reason: `PINCH_DENY RECEIPT_UNAVAILABLE: ${message}`,
      }
    }

    const used = callsUsed.get(receipt.receiptId) ?? 0
    const decision = evaluateAuthority(
      receipt,
      {
        runId,
        intentDigest,
        toolName: exec.name,
        arguments: exec.arguments,
        cwd: requiredEnv(cwdEnv) ?? process.cwd(),
        callsUsed: used,
      },
      { minimumEvidenceItems, pathKeys },
    )

    if (!decision.allowed) {
      return {
        kind: 'deny',
        reason: `PINCH_DENY ${decision.code}: ${decision.reason}`,
      }
    }

    // Make authorization a durable fact before permitting the execution token
    // to cross the monotonic guard. DeepSeek already logs tool/call before this
    // point and tool/result afterwards, so callId links the three facts on replay.
    if (exec.agent) {
      try {
        exec.agent.session.append('pinch/authority-admitted', {
          version: 1,
          runId,
          intentDigest,
          receiptId: receipt.receiptId,
          callId: exec.callId,
          toolName: exec.name,
          verifier: receipt.verification.verifier,
          evidenceCount: receipt.verification.evidence.length,
          evidenceDigest: digestEvidence(receipt.verification.evidence),
          expiresAt: receipt.expiresAt,
          callOrdinal: used + 1,
          ...(decision.resolvedPath ? { targetPath: decision.resolvedPath } : {}),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return {
          kind: 'deny',
          reason: `PINCH_DENY DURABLE_AUTHORITY_LOG_FAILED: ${message}`,
        }
      }
    }

    // Reserve only after the durable authority event succeeds. The monotonic
    // guard requires this exact execution token, so a later pre-execute listener
    // cannot manufacture an admitted side-effecting dispatch.
    callsUsed.set(receipt.receiptId, used + 1)
    admitted.add(exec.token)

    const downstream = await next()
    if (downstream.kind === 'deny') admitted.delete(exec.token)
    return downstream
  })

  ctx.tools.guard((exec) => {
    if (!protectedTools.has(exec.name)) return undefined
    if (admitted.has(exec.token)) return undefined
    return 'PINCH_DENY REFLEX_GATE_NOT_CROSSED: protected tool did not pass verified authority.'
  })

  // DeepSeek's ordinary durable `tool/result` is the canonical execution
  // outcome. We do not duplicate it; this listener only clears the live token.
  // Trusted postcondition auditors append `pinch/audit-recorded` separately.
  ctx.on('tools/result', (exec) => {
    admitted.delete(exec.token)
  })
}

export * from './policy.ts'
export * from './audit.ts'
export * from './ledger.ts'
export type * from './events.ts'
