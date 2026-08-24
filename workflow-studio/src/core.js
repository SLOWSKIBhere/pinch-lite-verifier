const encoder = new TextEncoder();

export const VERSION = 'tracenli-1.0.0';
export const CALIBRATION_STATUS = 'NOT_EMPIRICALLY_CALIBRATED';

export async function sha256(value) {
  const bytes = encoder.encode(typeof value === 'string' ? value : stableStringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function mapAtomicClaims(candidate) {
  return candidate.split(/(?<=[.!?])\s+|\n+/).map((text) => text.trim()).filter(Boolean).map((text, index) => ({
    claim_id: `C${String(index + 1).padStart(3, '0')}`,
    text,
    claim_type: /\d/.test(text) ? 'numeric' : /\b(causes?|because|therefore)\b/i.test(text) ? 'causal' : /\b(more|less|than)\b/i.test(text) ? 'comparative' : 'factual',
    criticality: /\b(must|always|never|critical)\b/i.test(text) ? 'high' : 'medium',
    source_span: text,
    requires_external_evidence: true,
    provenance_class: 'PROPOSAL',
    trust_state: 'MODEL_DERIVED',
  }));
}

export class DocumentProvider {
  constructor({ id, text, revision }) { this.snapshot = Object.freeze({ source_type: 'document', source_id: id, text, source_revision: revision }); }
  search(query) {
    const terms = query.toLowerCase().match(/[a-z0-9]+/g) || [];
    const sentences = this.snapshot.text.match(/[^.!?]+[.!?]?/g) || [];
    return sentences.map((span) => ({ span: span.trim(), score: terms.filter((term) => span.toLowerCase().includes(term)).length / Math.max(terms.length, 1) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item, index) => ({ reference_id: `DREF-${index + 1}`, candidate_span: item.span, retrieval_score: item.score, source_id: this.snapshot.source_id }));
  }
  fetch(reference) { return reference.source_id === this.snapshot.source_id ? this.snapshot : null; }
  async validate(reference, candidateSpan) {
    const source = this.fetch(reference);
    if (!source) return { status: 'EVIDENCE_EXTRACTION_INVALID', reason: 'UNKNOWN_SOURCE' };
    const start = source.text.indexOf(candidateSpan);
    if (start < 0) return { status: 'EVIDENCE_EXTRACTION_INVALID', reason: 'SPAN_NOT_IN_ORIGINAL_SOURCE' };
    const exact = source.text.slice(start, start + candidateSpan.length);
    return Object.freeze({ evidence_id: reference.evidence_id || 'E001', source_type: 'document', source_id: source.source_id, source_revision: source.source_revision, start_offset: start, end_offset: start + exact.length, exact_span: exact, content_hash: await sha256(exact), retrieval_query: reference.query || '', retrieval_method: 'deterministic_exact_source_slice', retrieval_score: reference.retrieval_score ?? 0, span_validation: 'VALIDATED', provenance_class: 'OBSERVATION', trust_state: 'SOURCE_VALIDATED' });
  }
}

export class GitHubSnapshotProvider extends DocumentProvider {
  constructor({ repository, path, commit, text }) { super({ id: `${repository}:${path}`, revision: commit, text }); this.repository = repository; this.path = path; this.commit = commit; }
  async validate(reference, candidateSpan) {
    const result = await super.validate(reference, candidateSpan);
    if (result.status) return result;
    const before = this.snapshot.text.slice(0, result.start_offset);
    return Object.freeze({ ...result, source_type: 'github_snapshot', repository: this.repository, path: this.path, commit_sha: this.commit, line_range: [before.split('\n').length, before.split('\n').length + candidateSpan.split('\n').length - 1] });
  }
}

function normalizedWords(value) { return new Set((value.toLowerCase().match(/[a-z0-9]+/g) || []).filter((word) => !['the', 'a', 'an', 'is', 'are', 'was', 'were'].includes(word))); }
export function semanticVerify(claim, packet, identity, options = {}) {
  if (options.throwError) return { claim_id: claim.claim_id, evidence_ids: packet.map((e) => e.evidence_id), verdict: 'VERIFIER_ERROR', raw_model_score: 0, quoted_support_span: '', limitations: ['Verifier exception retained.'], verifier_identity: identity, independence_boundary: options.independenceBoundary || 'Verifier received only claim and immutable evidence packet.' };
  if (!packet.length) return { claim_id: claim.claim_id, evidence_ids: [], verdict: 'INSUFFICIENT', raw_model_score: 0, quoted_support_span: '', limitations: ['No validated evidence.'], verifier_identity: identity, independence_boundary: options.independenceBoundary || 'Verifier received only claim and immutable evidence packet.' };
  const evidence = packet.map((item) => item.exact_span).join(' ');
  const claimWords = normalizedWords(claim.text); const evidenceWords = normalizedWords(evidence);
  const overlap = [...claimWords].filter((word) => evidenceWords.has(word)).length / Math.max(claimWords.size, 1);
  const claimNums = claim.text.match(/\b\d{2,4}\b/g) || []; const evidenceNums = evidence.match(/\b\d{2,4}\b/g) || [];
  const numericMismatch = overlap > .35 && claimNums.length && claimNums.some((number) => !evidenceNums.includes(number));
  const entities = (value) => value.match(/\b[A-Z][a-z]+\b/g) || [];
  const claimEntities = entities(claim.text); const evidenceEntities = entities(evidence);
  const entityMismatch = overlap > .45 && claimEntities.length && evidenceEntities.length && claimEntities.some((entity) => !evidenceEntities.includes(entity));
  const negationMismatch = /\b(not|never|no)\b/i.test(claim.text) !== /\b(not|never|no)\b/i.test(evidence);
  const verdict = numericMismatch || entityMismatch || (negationMismatch && overlap > .45) ? 'CONTRADICTED' : overlap >= (options.threshold || .62) ? 'ENTAILED' : 'INSUFFICIENT';
  return { claim_id: claim.claim_id, evidence_ids: packet.map((e) => e.evidence_id), verdict, raw_model_score: Number(overlap.toFixed(2)), quoted_support_span: verdict === 'ENTAILED' ? packet[0].exact_span : '', limitations: ['Deterministic lexical semantic proxy; not a truth probability.'], verifier_identity: identity, independence_boundary: options.independenceBoundary || 'Verifier received only claim and immutable evidence packet.' };
}

export function consensus(a, b) {
  const verdicts = [a.verdict, b.verdict];
  let decision = 'UNRESOLVED'; let reason = 'Insufficient support or verifier error.';
  if (verdicts.includes('CONTRADICTED')) { decision = 'BLOCK'; reason = 'At least one verifier contradicted the claim.'; }
  else if (verdicts[0] !== verdicts[1]) reason = 'Material verifier disagreement is preserved.';
  else if (verdicts.every((item) => item === 'ENTAILED')) { decision = 'PASS'; reason = 'Compatible entailed decisions satisfy configured policy.'; }
  return { decision, reason, decision_signal: verdicts.join('+'), decision_confidence: decision === 'PASS' ? 'SUPPORTED_BY_CONFIGURED_POLICY' : 'WITHHELD', calibration_status: CALIBRATION_STATUS, provenance_class: 'DECISION', trust_state: 'DETERMINISTIC_DECISION' };
}

export function decidePermission(action, claimDecisions, approval = null) {
  const epistemic_status = claimDecisions.every((item) => item.decision === 'PASS') ? 'VERIFIED_BY_CONFIGURED_PROCESS' : claimDecisions.some((item) => item.decision === 'BLOCK') ? 'CONTRADICTED' : 'UNRESOLVED';
  if (action === 'VERIFY_ONLY') return { epistemic_status, authorization_status: 'NO_ACTION_REQUESTED', permission_decision: 'NO_EXECUTION' };
  if (action === 'CREATE_GITHUB_ISSUE_IF_VERIFIED') return { epistemic_status, authorization_status: epistemic_status === 'VERIFIED_BY_CONFIGURED_PROCESS' && approval ? 'APPROVED' : 'NOT_AUTHORIZED', permission_decision: epistemic_status === 'VERIFIED_BY_CONFIGURED_PROCESS' && approval ? 'EXECUTE' : 'NO_EXECUTION' };
  const approved = epistemic_status === 'UNRESOLVED' && approval?.explicit === true;
  return { epistemic_status, authorization_status: approved ? 'APPROVED_WITH_DISCLOSED_UNCERTAINTY' : 'NOT_AUTHORIZED', permission_decision: approved ? 'EXECUTE' : 'NO_EXECUTION' };
}

export class GitHubActionAdapter {
  constructor(allowlist = []) { this.allowlist = allowlist; this.store = new Map(); }
  async execute(preview, permission, approval) {
    const authorized = permission.permission_decision === 'EXECUTE' && approval?.intent_digest === await sha256(preview) && this.allowlist.includes(preview.target);
    if (!authorized) return { attempted: false, tool_observation: null, reason: 'UNAPPROVED_OR_OUTSIDE_ALLOWLIST' };
    const number = this.store.size + 1; const observed = { number, title: preview.arguments.title, body: preview.arguments.body, target: preview.target };
    this.store.set(number, observed);
    return { attempted: true, tool_observation: { accepted: true, number }, requested: preview, approved: approval };
  }
  readBack(number) { return this.store.get(number) || null; }
}

export function auditPostcondition(execution, observed) {
  if (!execution?.attempted) return { audit_status: 'NOT_EXECUTED', postcondition_observation: observed || null };
  if (!observed) return { audit_status: 'AUDIT_INCOMPLETE', postcondition_observation: null };
  const wanted = execution.requested.arguments;
  const matches = wanted.title === observed.title && wanted.body === observed.body && execution.requested.target === observed.target;
  return { audit_status: matches ? 'VERIFIED_SUCCESS' : 'VERIFIED_FAILURE', postcondition_observation: observed, note: 'Status reflects read-back agreement, not factual truth.' };
}

export async function createReceipt(input) {
  const unsigned = { ...input, versions: { application: VERSION, receipt_schema: '1.0' }, timestamp: input.timestamp || new Date().toISOString(), integrity_notice: 'Hashing protects receipt integrity; it does not prove factual truth.' };
  return Object.freeze({ ...unsigned, receipt_hash: await sha256(unsigned) });
}
