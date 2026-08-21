import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { apply } from '../src/index.ts'
import type { AuthorityReceipt } from '../src/policy.ts'

type Listener = (...args: any[]) => any

type FakeExecution = {
  token: symbol
  callId: string
  name: string
  arguments: unknown
  signal: AbortSignal
}

class FakeContext {
  listeners = new Map<string, Listener>()
  guardListener: ((exec: FakeExecution) => string | undefined) | undefined

  tools = {
    guard: (listener: (exec: FakeExecution) => string | undefined) => {
      this.guardListener = listener
      return () => {
        if (this.guardListener === listener) this.guardListener = undefined
      }
    },
  }

  on(event: string, listener: Listener) {
    this.listeners.set(event, listener)
    return () => this.listeners.delete(event)
  }
}

function baseReceipt(overrides: Partial<AuthorityReceipt> = {}): AuthorityReceipt {
  return {
    version: 1,
    receiptId: 'receipt-adapter-1',
    runId: 'run-adapter-1',
    intentDigest: 'sha256:intent-adapter-1',
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    verification: {
      status: 'PASS',
      verifier: 'pinch-epistemic-verifier',
      evidence: ['source checked', 'test observed'],
    },
    allowedTools: ['write'],
    pathPrefixes: ['/repo'],
    allowUnscopedTools: [],
    maxCalls: 1,
    ...overrides,
  }
}

function execution(path = '/repo/file.txt'): FakeExecution {
  return {
    token: Symbol('exec'),
    callId: 'call-1',
    name: 'write',
    arguments: { path },
    signal: new AbortController().signal,
  }
}

async function withHarness(
  receipt: AuthorityReceipt,
  fn: (ctx: FakeContext, receiptFile: string) => Promise<void>,
) {
  const dir = await mkdtemp(join(tmpdir(), 'pinch-guard-'))
  const receiptFile = join(dir, 'authority.json')
  await writeFile(receiptFile, JSON.stringify(receipt), 'utf8')
  const oldRun = process.env.PINCH_RUN_ID
  const oldIntent = process.env.PINCH_INTENT_DIGEST
  const oldCwd = process.env.PINCH_CWD
  process.env.PINCH_RUN_ID = 'run-adapter-1'
  process.env.PINCH_INTENT_DIGEST = 'sha256:intent-adapter-1'
  process.env.PINCH_CWD = '/repo'

  const ctx = new FakeContext()
  apply(ctx as any, { receiptFile, protectedTools: ['write'] })

  try {
    await fn(ctx, receiptFile)
  } finally {
    if (oldRun === undefined) delete process.env.PINCH_RUN_ID
    else process.env.PINCH_RUN_ID = oldRun
    if (oldIntent === undefined) delete process.env.PINCH_INTENT_DIGEST
    else process.env.PINCH_INTENT_DIGEST = oldIntent
    if (oldCwd === undefined) delete process.env.PINCH_CWD
    else process.env.PINCH_CWD = oldCwd
    await rm(dir, { recursive: true, force: true })
  }
}

async function simulateDispatch(ctx: FakeContext, exec: FakeExecution) {
  const pre = ctx.listeners.get('tools/pre-execute')
  assert.ok(pre)
  assert.ok(ctx.guardListener)

  let bodyCalls = 0
  const preDecision = await pre(exec, async () => ({ kind: 'allow' }))
  if (preDecision.kind === 'allow') {
    const guardReason = ctx.guardListener(exec)
    if (!guardReason) bodyCalls += 1
  }
  return { preDecision, bodyCalls }
}

test('valid receipt crosses pre-execute and monotonic guard exactly once', async () => {
  await withHarness(baseReceipt(), async (ctx) => {
    const exec = execution()
    const first = await simulateDispatch(ctx, exec)
    assert.equal(first.preDecision.kind, 'allow')
    assert.equal(first.bodyCalls, 1)

    const result = ctx.listeners.get('tools/result')
    assert.ok(result)
    result(exec, { isError: false })
    assert.match(ctx.guardListener!(exec) ?? '', /REFLEX_GATE_NOT_CROSSED/)
  })
})

test('stale run produces zero dispatch', async () => {
  await withHarness(baseReceipt({ runId: 'run-old' }), async (ctx) => {
    const outcome = await simulateDispatch(ctx, execution())
    assert.equal(outcome.preDecision.kind, 'deny')
    assert.equal(outcome.bodyCalls, 0)
    assert.match(outcome.preDecision.reason, /STALE_RUN/)
  })
})

test('changed intent produces zero dispatch', async () => {
  await withHarness(baseReceipt({ intentDigest: 'sha256:old-intent' }), async (ctx) => {
    const outcome = await simulateDispatch(ctx, execution())
    assert.equal(outcome.preDecision.kind, 'deny')
    assert.equal(outcome.bodyCalls, 0)
    assert.match(outcome.preDecision.reason, /CHANGED_INTENT/)
  })
})

test('verifier unavailable produces zero dispatch', async () => {
  const receipt = baseReceipt()
  receipt.verification.status = 'UNAVAILABLE'
  await withHarness(receipt, async (ctx) => {
    const outcome = await simulateDispatch(ctx, execution())
    assert.equal(outcome.preDecision.kind, 'deny')
    assert.equal(outcome.bodyCalls, 0)
    assert.match(outcome.preDecision.reason, /VERIFICATION_NOT_PASS/)
  })
})

test('path escape produces zero dispatch', async () => {
  await withHarness(baseReceipt(), async (ctx) => {
    const outcome = await simulateDispatch(ctx, execution('/outside/file.txt'))
    assert.equal(outcome.preDecision.kind, 'deny')
    assert.equal(outcome.bodyCalls, 0)
    assert.match(outcome.preDecision.reason, /PATH_OUT_OF_SCOPE/)
  })
})

test('bounded receipt cannot dispatch twice', async () => {
  await withHarness(baseReceipt({ maxCalls: 1 }), async (ctx) => {
    const first = await simulateDispatch(ctx, execution('/repo/one.txt'))
    assert.equal(first.bodyCalls, 1)

    const second = await simulateDispatch(ctx, execution('/repo/two.txt'))
    assert.equal(second.preDecision.kind, 'deny')
    assert.equal(second.bodyCalls, 0)
    assert.match(second.preDecision.reason, /AUTHORITY_REPLAY/)
  })
})

test('unreadable receipt fails closed with zero dispatch', async () => {
  await withHarness(baseReceipt(), async (ctx, receiptFile) => {
    await rm(receiptFile, { force: true })
    const outcome = await simulateDispatch(ctx, execution())
    assert.equal(outcome.preDecision.kind, 'deny')
    assert.equal(outcome.bodyCalls, 0)
    assert.match(outcome.preDecision.reason, /RECEIPT_UNAVAILABLE/)
  })
})
