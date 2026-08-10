import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Route, ListTree, Waypoints, Sparkles, Puzzle, Scale, Database, GitMerge, KeyRound, Zap,
  ClipboardCheck, ShieldCheck, Plus, Copy, Download, Sun, Moon, ChevronRight, ChevronDown,
  ChevronUp, Trash2, Layers, AlertTriangle, OctagonAlert, Info, CheckCircle2, XCircle, Ban,
  HelpCircle, X, Check, ArrowUp, ArrowDown, Settings2, Loader2, ThumbsUp, ThumbsDown,
  GripVertical, Play, Pause, SkipForward, RotateCcw, Square, FileJson, FileText, Save,
  FolderOpen, FilePlus, Lock, Gauge, Filter, Clock, Circle, History, Workflow, Target,
} from 'lucide-react';

/* ============================== constants ============================== */

const ICON_MAP = {
  Route, ListTree, Waypoints, Sparkles, Puzzle, Scale, Database, GitMerge, KeyRound, Zap,
  ClipboardCheck, ShieldCheck, Target,
};

const CATEGORIES = {
  router: { label: 'Router', icon: Route, cls: 'cat-router' },
  planner: { label: 'Planner', icon: Waypoints, cls: 'cat-planner' },
  generator: { label: 'Generator', icon: Sparkles, cls: 'cat-generator' },
  verifier: { label: 'Verifier', icon: ShieldCheck, cls: 'cat-verifier' },
  consensus: { label: 'Consensus', icon: GitMerge, cls: 'cat-consensus' },
  permission_gate: { label: 'Permission Gate', icon: KeyRound, cls: 'cat-permission' },
  executor: { label: 'Executor', icon: Zap, cls: 'cat-executor' },
  auditor: { label: 'Auditor', icon: ClipboardCheck, cls: 'cat-auditor' },
};

const STAGE_STATUS = {
  idle: { label: 'Idle', icon: Circle, cls: 'st-idle' },
  queued: { label: 'Queued', icon: Clock, cls: 'st-queued' },
  running: { label: 'Running', icon: Loader2, cls: 'st-running' },
  passed: { label: 'Passed', icon: CheckCircle2, cls: 'st-passed' },
  failed: { label: 'Failed', icon: XCircle, cls: 'st-failed' },
  blocked: { label: 'Blocked', icon: Ban, cls: 'st-blocked' },
  awaiting_approval: { label: 'Awaiting approval', icon: HelpCircle, cls: 'st-waiting' },
  revised: { label: 'Revised', icon: RotateCcw, cls: 'st-revised' },
  skipped: { label: 'Skipped', icon: SkipForward, cls: 'st-skipped' },
};

const CONSENSUS_META = {
  PASS: { label: 'Pass', cls: 'st-passed' },
  REVISE: { label: 'Revise', cls: 'st-revised' },
  BLOCK: { label: 'Block', cls: 'st-blocked' },
  UNRESOLVED: { label: 'Unresolved', cls: 'st-waiting' },
};

const VERIFIER_STATUS_META = {
  confirmed: { label: 'Confirmed', cls: 'st-passed' },
  partially_supported: { label: 'Partially supported', cls: 'st-revised' },
  contradicted: { label: 'Contradicted', cls: 'st-blocked' },
  unverifiable: { label: 'Unverifiable', cls: 'st-waiting' },
  verifier_error: { label: 'Verifier error', cls: 'st-blocked' },
};

const METRIC_LABELS = {
  architectureCompleteness: 'Architecture Completeness',
  claimSupportCoverage: 'Claim Support Coverage',
  verifierAgreement: 'Verifier Agreement',
  permissionCompliance: 'Permission Compliance',
  executionAlignment: 'Execution Alignment',
  auditCoverage: 'Audit Coverage',
};

const TOOLTIP_TERMS = {
  claim_mapper: 'Splits the generated output into small, checkable statements ("atomic claims") before anything gets verified.',
  evidence_verifier: 'Checks a claim against the evidence cited for it, independently of the Ground-Truth Verifier.',
  ground_truth_verifier: 'Checks a claim against known reference facts, independently of the Evidence Verifier.',
  consensus: 'Reconciles the two independent verifier results into one decision per claim. Unavailable verification never becomes a pass.',
  permission_gate: 'The only stage that can authorize execution. A Generator request alone is never enough to reach the Executor.',
  criticality: 'How much a claim matters to the objective. Critical claims must be well supported or the run blocks.',
  executor: 'Only carries out what the Permission Gate actually authorized, nothing more.',
  auditor: 'Compares what was claimed against what actually happened, after execution, and flags mismatches.',
};

const DOMAIN_RULES = [
  {
    key: 'research',
    test: /\b(research|investigate|compare|approach(es)?|literature|study|studies|evidence|sources?|survey|analy[sz]e)\b/i,
    nodes: [
      { id: 'research_specialist', name: 'Research Specialist', category: 'generator', icon: 'Sparkles',
        responsibility: 'Gathers candidate approaches and source material for the objective.',
        instructions: 'Collect and summarize distinct approaches relevant to the objective with citations.',
        expectedInput: 'Sequenced plan', expectedOutput: 'Candidate approaches with source references',
        allowedTools: ['web_search'], riskLevel: 'low', retryLimit: 2, failureBehavior: 'retry_then_halt', afterId: 'planner' },
      { id: 'source_analyst', name: 'Source Analyst', category: 'verifier', icon: 'Scale',
        responsibility: 'Rates the credibility and relevance of gathered sources.',
        instructions: 'Score each source for credibility and flag weak or missing citations.',
        expectedInput: 'Candidate approaches with source references', expectedOutput: 'Source credibility ratings',
        allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt', afterId: 'generator' },
    ],
  },
  {
    key: 'creative',
    test: /\b(creative|campaign|brand|story|copy|slogan|design concept|marketing|ideation|tagline|jingle)\b/i,
    nodes: [
      { id: 'ideation_agent', name: 'Ideation Agent', category: 'generator', icon: 'Sparkles',
        responsibility: 'Produces a wide set of distinct creative directions.',
        instructions: 'Generate multiple distinct creative directions for the objective.',
        expectedInput: 'Sequenced plan', expectedOutput: 'Set of creative directions',
        allowedTools: [], riskLevel: 'low', retryLimit: 2, failureBehavior: 'retry_then_halt', afterId: 'planner' },
      { id: 'critique_agent', name: 'Critique Agent', category: 'verifier', icon: 'Puzzle',
        responsibility: 'Critiques creative directions against brand and audience fit.',
        instructions: 'Score each direction for originality, audience fit, and feasibility.',
        expectedInput: 'Set of creative directions', expectedOutput: 'Critique scores per direction',
        allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt', afterId: 'generator' },
    ],
  },
  {
    key: 'coding',
    test: /\b(code|coding|implement|function|api|bug|script|program(ming)?|software|repo(sitory)?|refactor|algorithm|debug|pull request)\b/i,
    nodes: [
      { id: 'implementation_agent', name: 'Implementation Agent', category: 'generator', icon: 'Sparkles',
        responsibility: 'Writes the code or technical change requested.',
        instructions: 'Implement the requested change, following the plan and stated constraints.',
        expectedInput: 'Sequenced plan', expectedOutput: 'Code changes / implementation',
        allowedTools: ['code_exec'], riskLevel: 'medium', retryLimit: 2, failureBehavior: 'retry_then_halt', afterId: 'planner' },
      { id: 'test_engineer', name: 'Test Engineer', category: 'verifier', icon: 'ShieldCheck',
        responsibility: 'Writes and runs tests against the implementation.',
        instructions: 'Exercise the implementation against expected behavior and edge cases.',
        expectedInput: 'Code changes / implementation', expectedOutput: 'Test results',
        allowedTools: ['code_exec'], riskLevel: 'low', retryLimit: 2, failureBehavior: 'retry_then_halt', afterId: 'generator' },
    ],
  },
  {
    key: 'data',
    test: /\b(data|dataset|csv|statistic(s)?|metric(s)?|numbers|analysis|chart|regression|correlation)\b/i,
    nodes: [
      { id: 'data_analyst', name: 'Data Analyst', category: 'generator', icon: 'Sparkles',
        responsibility: 'Analyzes the data and produces findings.',
        instructions: 'Compute the requested statistics or analysis from the available data.',
        expectedInput: 'Sequenced plan', expectedOutput: 'Data findings',
        allowedTools: ['code_exec'], riskLevel: 'medium', retryLimit: 2, failureBehavior: 'retry_then_halt', afterId: 'planner' },
      { id: 'validation_agent', name: 'Validation Agent', category: 'verifier', icon: 'Scale',
        responsibility: 'Re-derives key figures to validate the analysis.',
        instructions: 'Independently recompute key figures and flag discrepancies.',
        expectedInput: 'Data findings', expectedOutput: 'Validation results',
        allowedTools: ['code_exec'], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt', afterId: 'generator' },
    ],
  },
];

const HIGH_RISK_TEST = /\b(delete|purchase|payment|pay|deploy|production|send email|publish|transfer|execute trade|buy|sell|irreversible|charge|refund|balance)\b/i;

/* ============================== small utils ============================== */

let _uidN = 0;
function uid(prefix) {
  _uidN += 1;
  return prefix + '-' + _uidN + '-' + Math.random().toString(36).slice(2, 7);
}
function clsx(...a) { return a.filter(Boolean).join(' '); }
function clamp01to100(n) { return Math.max(0, Math.min(100, Math.round(n))); }
function truncate(s, n) { s = s || ''; return s.length > n ? s.slice(0, n - 1) + '\u2026' : s; }
function nowIso() { return new Date().toISOString(); }
function parseToolList(s) { return (s || '').split(',').map((t) => t.trim()).filter(Boolean); }
function downloadTextFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      return true;
    } catch (e2) { return false; }
  }
}

/* ============================== core PINCH nodes ============================== */

function makeCoreNodes() {
  const defs = [
    { id: 'router', name: 'Intent Router', category: 'router', icon: 'Route',
      responsibility: 'Classifies the objective and routes it to the right planning path.',
      instructions: 'Parse the user objective and identify its domain and risk posture.',
      expectedInput: 'Raw user objective text', expectedOutput: 'Objective classification and routing decision',
      allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt' },
    { id: 'decomposer', name: 'Task Decomposer', category: 'planner', icon: 'ListTree',
      responsibility: 'Breaks the objective into discrete sub-tasks.',
      instructions: 'Split the objective into an ordered list of sub-tasks with clear boundaries.',
      expectedInput: 'Classified objective', expectedOutput: 'Ordered sub-task list',
      allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt' },
    { id: 'planner', name: 'Planner', category: 'planner', icon: 'Waypoints',
      responsibility: 'Sequences sub-tasks into an executable plan with checkpoints.',
      instructions: 'Order sub-tasks, assign them to downstream agents, and define checkpoints.',
      expectedInput: 'Sub-task list', expectedOutput: 'Sequenced plan',
      allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt' },
    { id: 'generator', name: 'Generator', category: 'generator', icon: 'Sparkles',
      responsibility: 'Produces candidate answers, content, or code against the plan.',
      instructions: 'Generate a candidate response with explicit claims and supporting evidence references.',
      expectedInput: 'Sequenced plan', expectedOutput: 'Candidate output with claims and evidence references',
      allowedTools: ['web_search'], riskLevel: 'medium', retryLimit: 2, failureBehavior: 'retry_then_halt' },
    { id: 'claim_mapper', name: 'Semantic Claim Mapper', category: 'verifier', icon: 'Puzzle',
      responsibility: 'Extracts atomic, checkable claims from the generated output.',
      instructions: 'Decompose the candidate output into atomic claims, each tagged with criticality.',
      expectedInput: 'Candidate output', expectedOutput: 'Atomic claim list',
      allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt' },
    { id: 'evidence_verifier', name: 'Evidence Verifier', category: 'verifier', icon: 'Scale',
      responsibility: 'Checks each claim against cited evidence, independently.',
      instructions: 'Weigh the evidence attached to each claim without consulting the ground-truth verifier.',
      expectedInput: 'Atomic claim list', expectedOutput: 'Per-claim evidence verdicts',
      allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt' },
    { id: 'ground_truth_verifier', name: 'Ground-Truth Verifier', category: 'verifier', icon: 'Database',
      responsibility: 'Checks each claim against known reference facts, independently.',
      instructions: 'Compare each claim to reference facts without consulting the evidence verifier.',
      expectedInput: 'Atomic claim list', expectedOutput: 'Per-claim ground-truth verdicts',
      allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt' },
    { id: 'consensus', name: 'Verifier Consensus', category: 'consensus', icon: 'GitMerge',
      responsibility: 'Reconciles the two independent verifier verdicts into one decision per claim.',
      instructions: 'Apply deterministic consensus rules. Unavailable verification never becomes a pass.',
      expectedInput: 'Two independent verdict sets', expectedOutput: 'Per-claim consensus decision',
      allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt' },
    { id: 'permission_gate', name: 'Permission Gate', category: 'permission_gate', icon: 'KeyRound',
      responsibility: 'Authorizes, blocks, or escalates any action before execution.',
      instructions: 'Evaluate consensus, requested tools, and risk level. A generator request alone never authorizes execution.',
      expectedInput: 'Consensus decisions and requested action', expectedOutput: 'EXECUTE / BLOCK / REVISE / REQUIRE_APPROVAL',
      allowedTools: [], riskLevel: 'medium', retryLimit: 0, failureBehavior: 'halt' },
    { id: 'executor', name: 'Bounded Executor', category: 'executor', icon: 'Zap',
      responsibility: 'Carries out only what the Permission Gate authorized.',
      instructions: 'Execute strictly within the authorized scope and record the actual attempted action.',
      expectedInput: 'Authorized action', expectedOutput: 'Simulated execution result',
      allowedTools: ['web_search'], riskLevel: 'medium', retryLimit: 1, failureBehavior: 'halt' },
    { id: 'auditor', name: 'Post-Execution Auditor', category: 'auditor', icon: 'ClipboardCheck',
      responsibility: 'Compares what was requested, permitted, approved, attempted, and claimed.',
      instructions: 'Flag any mismatch between claimed results and actual simulated results.',
      expectedInput: 'Execution record and original claims', expectedOutput: 'Audit findings',
      allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt' },
  ];
  return defs.map((n) => ({ ...n, core: true, locked: true, enabled: true, custom: false }));
}

const CORE_ORDER = ['router', 'decomposer', 'planner', 'generator', 'claim_mapper', 'evidence_verifier', 'ground_truth_verifier', 'consensus', 'permission_gate', 'executor', 'auditor'];

/* ============================== workflow generation ============================== */

function generateWorkflowFromObjective(objective) {
  const base = makeCoreNodes();
  const text = ((objective.text || '') + ' ' + (objective.output || '')).toLowerCase();
  let extra = [];
  const matchedDomains = [];
  DOMAIN_RULES.forEach((rule) => {
    if (rule.test.test(text)) {
      matchedDomains.push(rule.key);
      extra = extra.concat(rule.nodes.map((n) => ({ ...n })));
    }
  });
  const highRisk = HIGH_RISK_TEST.test(text) || objective.maxRisk === 'high';

  let nodes = [...base];
  extra.forEach((n) => {
    const idx = nodes.findIndex((x) => x.id === n.afterId);
    const clean = { ...n };
    delete clean.afterId;
    clean.core = false; clean.locked = false; clean.enabled = true; clean.custom = false;
    if (idx === -1) nodes.push(clean); else nodes.splice(idx + 1, 0, clean);
  });

  if (highRisk) {
    nodes = nodes.map((n) => (n.id === 'executor' ? { ...n, riskLevel: 'high' } : n));
    nodes = nodes.map((n) => (n.id === 'permission_gate' ? { ...n, retryLimit: 0 } : n));
    const auditorIdx = nodes.findIndex((x) => x.id === 'auditor');
    const complianceNode = {
      id: 'compliance_reviewer', name: 'Compliance Reviewer', category: 'auditor', icon: 'ClipboardCheck',
      responsibility: 'Adds a second audit pass for high-risk or mutating actions.',
      instructions: 'Re-check the audit findings for irreversible or mutating actions before the run is marked complete.',
      expectedInput: 'Audit findings', expectedOutput: 'Compliance sign-off',
      allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt',
      core: false, locked: false, enabled: true, custom: false,
    };
    nodes.splice(auditorIdx + 1, 0, complianceNode);
  }
  return { nodes, matchedDomains, highRisk };
}

/* ============================== seeded examples ============================== */

const EXAMPLES = [
  {
    id: 'research-brief', label: 'Verified research brief',
    description: 'A research objective that clears every gate: supported claims, agreeing verifiers, low risk.',
    objective: {
      text: 'Research three approaches to reducing hallucinations in an educational AI assistant and produce a verified recommendation.',
      output: 'A short written recommendation naming the best approach with supporting evidence.',
      audience: 'A product team deciding which approach to prototype next.',
      constraints: 'Use only publicly documented techniques. No new model training.',
      successCriteria: 'The recommendation cites at least two independent sources per approach and names one clear winner.',
      tools: 'web_search, document_read', maxRisk: 'low',
    },
    claims: [
      { text: 'Retrieval-augmented generation reduces unsupported factual claims versus a closed-book baseline.', criticality: 'critical', evidence: ['benchmark-comparison-1', 'benchmark-comparison-2'], groundTruthMatch: true },
      { text: 'Structured verifier rubrics catch a meaningful share of unsupported claims before they reach a user.', criticality: 'medium', evidence: ['case-study-1', 'case-study-2'], groundTruthMatch: true },
      { text: 'Recommendation: prototype retrieval-augmented generation with a lightweight verifier rubric first.', criticality: 'critical', evidence: ['synthesis-of-above', 'team-review'], groundTruthMatch: true },
    ],
  },
  {
    id: 'creative-campaign', label: 'Creative campaign workflow',
    description: 'A marketing objective with subjective, lower-stakes claims that need a human call.',
    objective: {
      text: 'Develop three creative directions for a back-to-school campaign for a mid-size backpack brand.',
      output: 'Three named creative directions, each with a headline, visual concept, and one-line rationale.',
      audience: 'Parents and teens shopping for a new backpack in August.',
      constraints: 'Keep it brand-safe. No direct competitor comparisons.',
      successCriteria: 'Each direction is visually distinct and ties back to a real back-to-school moment.',
      tools: 'web_search', maxRisk: 'low',
    },
    claims: [
      { text: '"Fresh Start" direction tests well with the back-to-school anxiety-relief angle.', criticality: 'medium', evidence: ['past-campaign-note'], groundTruthMatch: undefined },
      { text: '"Built for the Bell" direction leans on durability as the emotional hook.', criticality: 'medium', evidence: ['past-campaign-note'], groundTruthMatch: undefined },
      { text: '"Pack Your Personality" direction is the most differentiated of the three.', criticality: 'low', evidence: [], groundTruthMatch: undefined },
    ],
  },
  {
    id: 'coding-assistant', label: 'Safe coding assistant workflow',
    description: 'A coding objective where the fix and tests hold up, but one thinly-cited claim needs revision before it ships.',
    objective: {
      text: 'Build a coding assistant workflow that fixes a failing test in a small utility function and opens a pull request.',
      output: 'A patched function, a passing test suite, and an opened pull request.',
      audience: 'A solo developer maintaining a small open-source utility library.',
      constraints: 'Do not modify the public function signature. Do not touch unrelated files.',
      successCriteria: 'The previously failing test passes and no other tests regress.',
      tools: 'code_exec, git_write', maxRisk: 'high',
    },
    claims: [
      { text: 'The failing test was caused by an off-by-one error in the range check.', criticality: 'critical', evidence: ['test-output', 'diff-review'], groundTruthMatch: true },
      { text: 'The patched function passes the full existing test suite.', criticality: 'critical', evidence: ['test-output', 'ci-log'], groundTruthMatch: true },
      { text: 'The pull request description accurately summarizes the fix.', criticality: 'low', evidence: ['pr-diff'], groundTruthMatch: true },
    ],
  },
  {
    id: 'adversarial', label: 'Adversarial test (should fail safely)',
    description: 'Deliberately broken: an unsupported critical claim, an authorization skip attempt, an unknown tool, and an overclaimed result.',
    objective: {
      text: 'Send a payment confirmation email to all customers and update their account balance immediately.',
      output: 'Confirmation emails sent and balances updated.',
      audience: 'All active customer accounts.',
      constraints: 'Must be reversible and logged.',
      successCriteria: 'Every customer receives exactly one email and balances match the ledger.',
      tools: 'email_send', maxRisk: 'high',
    },
    claims: [
      { text: 'All 4,213 customer balances were updated correctly in the ledger.', criticality: 'critical', evidence: [], groundTruthMatch: false },
      { text: 'Confirmation emails were queued through the approved email tool.', criticality: 'critical', evidence: ['queue-log'], groundTruthMatch: false },
      { text: 'No duplicate emails were sent.', criticality: 'medium', evidence: ['queue-log'], groundTruthMatch: undefined },
    ],
    unknownTool: 'mass_ledger_write',
    skipAttempt: true,
  },
];

/* ============================== architecture analysis ============================== */

function analyzeArchitecture({ nodes, objective, claims, consensusMap }) {
  const findings = [];
  const byId = (id) => nodes.find((n) => n.id === id);
  const idx = (id) => nodes.findIndex((n) => n.id === id);
  const push = (severity, nodeId, explanation, recommendation, id) =>
    findings.push({ id: id || (nodeId || 'general') + '-' + findings.length, severity, nodeId: nodeId || null, explanation, recommendation });

  if (!objective.text.trim()) push('critical', null, 'The objective is empty.', 'Describe what the workflow should accomplish in the Objective Canvas.', 'missing-objective');
  if (!objective.successCriteria.trim()) push('warning', null, 'No success criteria are defined.', 'State how you will know the output is good enough.', 'missing-success-criteria');
  if (!objective.output.trim() || objective.output.trim().length < 3) push('warning', null, 'The intended output is unclear or too short.', 'Describe the concrete artifact the workflow should produce.', 'unclear-output');

  nodes.filter((n) => n.category === 'verifier').forEach((v) => {
    if (!v.enabled) push('critical', v.id, v.name + ' is disabled, so its claims go unchecked.', 'Re-enable ' + v.name + ' before running verification.', 'disabled-verifier-' + v.id);
  });

  const consensusNode = byId('consensus');
  if (consensusNode && !consensusNode.enabled) push('critical', 'consensus', 'Verifier Consensus is disabled; verifier disagreements will never be reconciled.', 'Re-enable Verifier Consensus.', 'missing-consensus');

  const gateNode = byId('permission_gate');
  if (gateNode && !gateNode.enabled) push('critical', 'permission_gate', 'The Permission Gate is disabled; nothing stands between the Generator and execution.', 'Re-enable the Permission Gate.', 'missing-permission-gate');

  const executorIdx = idx('executor');
  const gateIdx = idx('permission_gate');
  if (executorIdx !== -1 && gateIdx !== -1 && executorIdx < gateIdx) push('critical', 'executor', 'The Bounded Executor appears before the Permission Gate in the pipeline.', 'Move the Executor after the Permission Gate.', 'executor-before-gate');

  const auditorNode = byId('auditor');
  if (auditorNode && !auditorNode.enabled) push('warning', 'auditor', 'The Post-Execution Auditor is disabled; execution mismatches would go uncaught.', 'Re-enable the Post-Execution Auditor.', 'missing-auditor');

  const generatorIdx = idx('generator');
  if (generatorIdx !== -1 && executorIdx !== -1 && executorIdx > generatorIdx) {
    const between = nodes.slice(generatorIdx + 1, executorIdx);
    const activeGate = between.some((n) => ['verifier', 'consensus', 'permission_gate'].indexOf(n.category) !== -1 && n.enabled);
    if (!activeGate) push('critical', 'generator', 'No active verification or authorization stage stands between the Generator and the Executor.', 'Keep at least one verifier, Consensus, and the Permission Gate enabled between Generator and Executor.', 'generator-to-executor');
  }

  const permitted = (objective.tools || '').toLowerCase();
  nodes.forEach((n) => {
    if (n.enabled && (!n.expectedInput.trim() || !n.expectedOutput.trim())) push('warning', n.id, n.name + ' has no defined input or output.', 'Fill in expected input and output in the inspector.', 'io-' + n.id);
    if (n.retryLimit > 5) push('warning', n.id, n.name + ' allows an unusually high number of retries (' + n.retryLimit + ').', 'Lower the retry limit to 3 or fewer.', 'retries-' + n.id);
    (n.allowedTools || []).forEach((t) => {
      if (t && permitted.indexOf(t.toLowerCase()) === -1) push('warning', n.id, n.name + ' is allowed to use "' + t + '", which is not in the objective permitted-tools list.', 'Add "' + t + '" to permitted tools or remove it from ' + n.name + '.', 'tool-' + n.id + '-' + t);
    });
  });

  const enabledCount = nodes.filter((n) => n.enabled).length;
  if (enabledCount <= 4) push('info', null, 'Very few active agents are handling a multi-stage objective.', 'Consider whether one agent is doing the work of several roles.', 'single-agent-overload');

  if (claims && claims.length && consensusMap) {
    claims.forEach((c) => {
      if (c.criticality === 'critical' && consensusMap[c.id] === 'UNRESOLVED') {
        push('critical', 'consensus', 'Critical claim "' + truncate(c.text, 60) + '" remains unresolved.', 'Gather stronger evidence or ground-truth support before proceeding.', 'unresolved-' + c.id);
      }
    });
  }

  const anyFailureBehaviorSet = nodes.some((n) => n.enabled && n.failureBehavior && n.failureBehavior !== 'none');
  if (!anyFailureBehaviorSet) push('warning', null, 'No node defines a failure behavior; the workflow has no failure path.', 'Set a failure behavior on at least the verifier and executor stages.', 'no-failure-path');

  return findings;
}

function applySafeFixes(nodes, findings, objective) {
  let next = nodes.map((n) => ({ ...n, allowedTools: [...(n.allowedTools || [])] }));
  const permitted = (objective.tools || '').toLowerCase();
  let fixedCount = 0;

  findings.forEach((f) => {
    if (f.id.indexOf('disabled-verifier-') === 0 || f.id === 'missing-consensus' || f.id === 'missing-permission-gate' || f.id === 'missing-auditor') {
      const node = next.find((n) => n.id === f.nodeId);
      if (node && !node.enabled) { next = next.map((n) => (n.id === f.nodeId ? { ...n, enabled: true } : n)); fixedCount++; }
    } else if (f.id.indexOf('retries-') === 0) {
      const node = next.find((n) => n.id === f.nodeId);
      if (node && node.retryLimit > 3) { next = next.map((n) => (n.id === f.nodeId ? { ...n, retryLimit: 3 } : n)); fixedCount++; }
    } else if (f.id.indexOf('tool-') === 0) {
      const node = next.find((n) => n.id === f.nodeId);
      if (node) {
        const filtered = node.allowedTools.filter((t) => permitted.indexOf(t.toLowerCase()) !== -1);
        if (filtered.length !== node.allowedTools.length) { next = next.map((n) => (n.id === f.nodeId ? { ...n, allowedTools: filtered } : n)); fixedCount++; }
      }
    } else if (f.id === 'no-failure-path') {
      next = next.map((n) => (['verifier', 'executor', 'auditor', 'consensus', 'permission_gate'].indexOf(n.category) !== -1 && (!n.failureBehavior || n.failureBehavior === 'none') ? { ...n, failureBehavior: 'retry_then_halt' } : n));
      fixedCount++;
    } else if (f.id === 'generator-to-executor' || f.id === 'executor-before-gate') {
      next = next.map((n) => (['verifier', 'consensus', 'permission_gate'].indexOf(n.category) !== -1 ? { ...n, enabled: true } : n));
      fixedCount++;
    }
  });

  return { nodes: next, fixedCount };
}

/* ============================== claims & verification ============================== */

function buildGenericClaims(objective, matchedDomains) {
  const base = (objective.text || '').trim();
  const words = base.split(/\s+/).filter(Boolean);
  const wc = words.length;
  const evidenceCount = wc >= 14 ? 3 : wc >= 8 ? 2 : wc >= 3 ? 1 : 0;
  const domainLabel = matchedDomains && matchedDomains.length ? matchedDomains[0] : 'general';
  const mkEvidence = (n) => Array.from({ length: n }, (_, i) => 'evidence-ref-' + (i + 1));
  const gt = evidenceCount >= 2 ? true : (evidenceCount === 0 ? undefined : undefined);
  return [
    { id: 'claim-1', text: 'The primary approach satisfies the stated objective: "' + truncate(base, 70) + '".', sourceStage: 'generator', criticality: 'critical', generatorConfidence: 0.8, evidence: mkEvidence(evidenceCount), groundTruthMatch: gt },
    { id: 'claim-2', text: 'A supporting ' + domainLabel + ' consideration reinforces the primary approach.', sourceStage: 'generator', criticality: 'medium', generatorConfidence: 0.72, evidence: mkEvidence(Math.max(0, evidenceCount - 1)), groundTruthMatch: undefined },
    { id: 'claim-3', text: 'The recommendation synthesizes the above into one actionable next step.', sourceStage: 'generator', criticality: 'low', generatorConfidence: 0.66, evidence: mkEvidence(Math.min(1, evidenceCount)), groundTruthMatch: undefined },
  ];
}

function buildClaims(objective, matchedDomains, exampleDef) {
  if (exampleDef) {
    return exampleDef.claims.map((c, i) => ({
      id: 'claim-' + (i + 1), text: c.text, sourceStage: 'generator', criticality: c.criticality,
      generatorConfidence: c.criticality === 'critical' ? 0.9 : 0.75, evidence: c.evidence, groundTruthMatch: c.groundTruthMatch,
    }));
  }
  return buildGenericClaims(objective, matchedDomains);
}

function computeEvidenceVerifier(claim) {
  const n = (claim.evidence || []).length;
  if (n >= 2) return { status: 'confirmed', rationale: n + ' independent evidence references support this claim.', support: 'strong', uncertainty: 'low' };
  if (n === 1) return { status: 'partially_supported', rationale: 'Only one evidence reference is attached; more would strengthen this.', support: 'moderate', uncertainty: 'medium' };
  return { status: 'unverifiable', rationale: 'No evidence references are attached to this claim.', support: 'none', uncertainty: 'high' };
}

function computeGroundTruthVerifier(claim) {
  if (claim.groundTruthMatch === true) return { status: 'confirmed', rationale: 'Matches the reference facts on file.', support: 'strong', uncertainty: 'low' };
  if (claim.groundTruthMatch === false) return { status: 'contradicted', rationale: 'Conflicts with the reference facts on file.', support: 'none', uncertainty: 'low' };
  return { status: 'unverifiable', rationale: 'No reference fact is on file to check this claim against.', support: 'none', uncertainty: 'high' };
}

function computeConsensus(claim, ev, gt) {
  const conflicting = (ev.status === 'confirmed' && gt.status === 'contradicted') || (gt.status === 'confirmed' && ev.status === 'contradicted');
  const eitherUnavailable = ev.status === 'unverifiable' || gt.status === 'unverifiable';
  const eitherContradicted = ev.status === 'contradicted' || gt.status === 'contradicted';
  const bothConfirmed = ev.status === 'confirmed' && gt.status === 'confirmed';

  if (conflicting) return 'UNRESOLVED';
  if (claim.criticality === 'critical' && (eitherUnavailable || eitherContradicted)) return 'BLOCK';
  if (bothConfirmed) return 'PASS';
  if (eitherContradicted) return 'BLOCK';
  if (eitherUnavailable) return 'UNRESOLVED';
  if (ev.status === 'partially_supported' || gt.status === 'partially_supported') return 'REVISE';
  return 'UNRESOLVED';
}

/* ============================== permission, execution, audit ============================== */

function computePermissionDecision({ nodes, objective, claims, consensusMap }) {
  const permitted = parseToolList(objective.tools).map((t) => t.toLowerCase());
  const requested = new Set();
  nodes.filter((n) => n.enabled).forEach((n) => (n.allowedTools || []).forEach((t) => requested.add(t)));
  const disallowed = [...requested].filter((t) => !permitted.some((p) => p && t.toLowerCase().indexOf(p) !== -1));

  const blockedClaims = claims.filter((c) => consensusMap[c.id] === 'BLOCK');
  const unresolvedClaims = claims.filter((c) => consensusMap[c.id] === 'UNRESOLVED');
  const reviseClaims = claims.filter((c) => consensusMap[c.id] === 'REVISE');
  const executorNode = nodes.find((n) => n.id === 'executor');
  const highRisk = (executorNode && executorNode.riskLevel === 'high') || objective.maxRisk === 'high';

  if (blockedClaims.length > 0) {
    return { decision: 'BLOCK', reason: blockedClaims.length + ' claim(s) failed consensus with a BLOCK result, including: "' + truncate(blockedClaims[0].text, 70) + '".', disallowed };
  }
  if (disallowed.length > 0) {
    return { decision: 'BLOCK', reason: 'Requested tool(s) not permitted by the objective: ' + disallowed.join(', ') + '.', disallowed };
  }
  if (unresolvedClaims.length > 0) {
    return { decision: 'REQUIRE_APPROVAL', reason: unresolvedClaims.length + ' claim(s) are unresolved and need a human decision before execution.', disallowed };
  }
  if (reviseClaims.length > 0) {
    return { decision: 'REVISE', reason: reviseClaims.length + ' claim(s) need revision before this workflow is ready to execute.', disallowed };
  }
  if (highRisk) {
    return { decision: 'REQUIRE_APPROVAL', reason: 'The Bounded Executor is flagged high-risk, so explicit approval is required even though all claims passed.', disallowed };
  }
  return { decision: 'EXECUTE', reason: 'All claims passed consensus, requested tools are permitted, and risk is within bounds.', disallowed };
}

function simulateExecutorRun(claims, executorNode) {
  const primaryClaim = claims.find((c) => c.criticality === 'critical') || claims[0];
  return {
    attemptedAction: 'Carry out the authorized action using: ' + ((executorNode.allowedTools || []).join(', ') || 'no tools required') + '.',
    actualResult: 'Completed within authorized scope. Result is consistent with: "' + truncate(primaryClaim ? primaryClaim.text : 'the generated output', 90) + '".',
    claimedResult: primaryClaim ? primaryClaim.text : 'the generated output',
    success: true,
  };
}

const ASSERTS_COMPLETION = /\b(updated|sent|completed|confirmed|passed|resolved|fixed|queued|processed|delivered)\b/i;

function runAudit({ objective, gateDecision, executorResult, claims }) {
  const criticalClaim = claims.find((c) => c.criticality === 'critical') || claims[0];
  const assertsCompletion = criticalClaim ? ASSERTS_COMPLETION.test(criticalClaim.text) : false;
  const requested = (gateDecision.disallowed && gateDecision.disallowed.length)
    ? 'Execute using: ' + gateDecision.disallowed.join(', ') + ' (not permitted)'
    : 'Execute the plan using permitted tools only';
  const permitted = 'Tools permitted by objective: ' + (objective.tools || 'none specified');
  const approved = gateDecision.decision;
  let attempted, simulatedResult, mismatch;
  if (executorResult) {
    attempted = executorResult.attemptedAction;
    simulatedResult = executorResult.actualResult;
    mismatch = !executorResult.success;
  } else {
    attempted = 'No action was attempted (execution was not authorized).';
    simulatedResult = 'No action was attempted \u2014 Permission Gate returned ' + gateDecision.decision + '.';
    mismatch = assertsCompletion && gateDecision.decision !== 'EXECUTE';
  }
  const claimedResult = criticalClaim ? criticalClaim.text : 'N/A';
  const note = mismatch
    ? 'Mismatch detected: the claimed result does not match what the Bounded Executor actually reported.'
    : (executorResult ? 'Simulated result is consistent with the claimed result.' : 'No execution occurred, so there is nothing to reconcile against the claims.');
  return { requested, permitted, approved, attempted, simulatedResult, claimedResult, mismatch, note };
}

/* ============================== simulation state machine ============================== */

const initialSimState = {
  status: 'idle', stageIndex: -1, stageStates: {}, stageData: {}, events: [],
  approval: null, approvedOnce: false, gateDecision: null, executorResult: null, audit: null,
  claims: [], verifierResults: {}, consensusMap: {},
  snapshotNodes: null, snapshotObjective: null, exampleDef: null, matchedDomains: [],
};

function mkEvent(nodeId, type, message) {
  return { id: uid('evt'), time: nowIso(), nodeId, type, message };
}

function advanceSimulation(sim, nodes, objective, exampleDef, matchedDomains) {
  const activeNodes = nodes.filter((n) => n.enabled);
  if (sim.stageIndex + 1 >= activeNodes.length) {
    return { ...sim, status: 'completed' };
  }
  const stageIdx = sim.stageIndex + 1;
  const node = activeNodes[stageIdx];
  const events = [...sim.events];
  const stageStates = { ...sim.stageStates };
  const stageData = { ...sim.stageData };
  let claims = sim.claims;
  let verifierResults = { ...sim.verifierResults };
  let consensusMap = { ...sim.consensusMap };
  let gateDecision = sim.gateDecision;
  let executorResult = sim.executorResult;
  let audit = sim.audit;
  let nextRunStatus = 'running';
  let approval = null;

  const logEvent = (type, message) => events.push(mkEvent(node.id, type, message));
  const input = stageIdx === 0 ? truncate(objective.text || '', 90) : 'Output of ' + activeNodes[stageIdx - 1].name;
  let output = '';
  let duration = 300 + ((node.name.length * 37) % 500);
  let reason = '';
  let status = 'passed';

  if (node.category === 'router') {
    output = 'Classified as: ' + (matchedDomains.length ? matchedDomains.join(', ') : 'general') + ' objective.';
    logEvent('info', 'Routed objective as ' + (matchedDomains.length ? matchedDomains.join(', ') : 'general') + '.');
  } else if (node.category === 'planner') {
    output = node.id === 'decomposer' ? 'Objective split into sub-tasks.' : node.name + ' produced a structured plan.';
    logEvent('info', node.name + ' completed.');
  } else if (node.category === 'generator') {
    if (node.id === 'generator') {
      claims = buildClaims(objective, matchedDomains, exampleDef);
      output = 'Generated ' + claims.length + ' claims for downstream verification.';
      if (exampleDef && exampleDef.skipAttempt) {
        logEvent('warning', 'Generator attempted to pass its output directly to the Bounded Executor, bypassing the Permission Gate. Request intercepted and routed through Semantic Claim Mapper \u2192 Verifiers \u2192 Consensus \u2192 Permission Gate as required.');
      } else {
        logEvent('info', 'Generator produced a candidate output with ' + claims.length + ' claims.');
      }
    } else {
      output = node.name + ' produced supporting candidate content.';
      logEvent('info', node.name + ' completed.');
    }
  } else if (node.category === 'verifier') {
    if (node.id === 'claim_mapper') {
      output = 'Mapped ' + claims.length + ' atomic claims from the Generator output.';
      logEvent('info', 'Claims mapped and tagged with criticality.');
    } else if (node.id === 'evidence_verifier') {
      claims.forEach((c) => { verifierResults[c.id] = { ...(verifierResults[c.id] || {}), evidence: computeEvidenceVerifier(c) }; });
      output = 'Evidence-checked ' + claims.length + ' claims independently.';
      logEvent('info', 'Evidence Verifier completed an independent pass.');
    } else if (node.id === 'ground_truth_verifier') {
      claims.forEach((c) => { verifierResults[c.id] = { ...(verifierResults[c.id] || {}), groundTruth: computeGroundTruthVerifier(c) }; });
      output = 'Ground-truth-checked ' + claims.length + ' claims independently.';
      logEvent('info', 'Ground-Truth Verifier completed an independent pass.');
    } else {
      output = node.name + ' completed its check.';
      logEvent('info', node.name + ' completed.');
    }
  } else if (node.category === 'consensus') {
    claims.forEach((c) => {
      const ev = (verifierResults[c.id] && verifierResults[c.id].evidence) || computeEvidenceVerifier(c);
      const gt = (verifierResults[c.id] && verifierResults[c.id].groundTruth) || computeGroundTruthVerifier(c);
      consensusMap[c.id] = computeConsensus(c, ev, gt);
    });
    const blockCount = Object.values(consensusMap).filter((v) => v === 'BLOCK').length;
    const unresolvedCount = Object.values(consensusMap).filter((v) => v === 'UNRESOLVED').length;
    output = 'Consensus reached for ' + claims.length + ' claims (' + blockCount + ' blocked, ' + unresolvedCount + ' unresolved).';
    status = blockCount > 0 ? 'failed' : (unresolvedCount > 0 ? 'revised' : 'passed');
    logEvent(blockCount > 0 ? 'critical' : 'info', 'Consensus: ' + blockCount + ' BLOCK, ' + unresolvedCount + ' UNRESOLVED among ' + claims.length + ' claims.');
  } else if (node.category === 'permission_gate') {
    gateDecision = computePermissionDecision({ nodes, objective, claims, consensusMap });
    output = 'Decision: ' + gateDecision.decision + '. ' + gateDecision.reason;
    if (gateDecision.decision === 'REQUIRE_APPROVAL') {
      status = 'awaiting_approval'; nextRunStatus = 'awaiting_approval';
      const execNode = nodes.find((n) => n.id === 'executor');
      approval = {
        nodeId: node.id,
        tool: (execNode && execNode.allowedTools && execNode.allowedTools[0]) || 'none requested',
        purpose: 'Carry out the authorized action from the Bounded Executor.',
        args: { objective: truncate(objective.text || '', 90), riskLevel: execNode ? execNode.riskLevel : 'unknown' },
        risk: execNode ? execNode.riskLevel : 'unknown',
        scope: objective.tools || 'none specified',
      };
      logEvent('approval', 'REQUIRE_APPROVAL: ' + gateDecision.reason);
    } else if (gateDecision.decision === 'BLOCK') {
      status = 'blocked'; logEvent('critical', 'BLOCK: ' + gateDecision.reason);
    } else if (gateDecision.decision === 'REVISE') {
      status = 'revised'; logEvent('warning', 'REVISE: ' + gateDecision.reason);
    } else {
      logEvent('info', 'EXECUTE: ' + gateDecision.reason);
    }
  } else if (node.category === 'executor') {
    if ((gateDecision && gateDecision.decision === 'EXECUTE') || sim.approvedOnce) {
      executorResult = simulateExecutorRun(claims, node);
      output = executorResult.actualResult;
      status = executorResult.success === false ? 'failed' : 'passed';
      logEvent(status === 'failed' ? 'critical' : 'info', 'Bounded Executor ran within its authorized scope.');
    } else {
      output = 'Not executed \u2014 the Permission Gate did not authorize this action.';
      status = 'blocked';
      reason = gateDecision ? gateDecision.reason : 'No permission gate decision on record.';
      logEvent('critical', 'Bounded Executor was skipped: no authorization on record.');
    }
  } else if (node.category === 'auditor') {
    audit = runAudit({ objective, gateDecision: gateDecision || { decision: 'BLOCK', reason: 'No decision recorded.', disallowed: [] }, executorResult, claims });
    output = audit.note;
    status = audit.mismatch ? 'failed' : 'passed';
    logEvent(audit.mismatch ? 'critical' : 'info', audit.note);
  } else {
    output = node.name + ' completed.';
    logEvent('info', node.name + ' completed.');
  }

  stageStates[node.id] = status;
  stageData[node.id] = { input, output, duration, reason, startedAt: Date.now() };

  return {
    ...sim, stageIndex: stageIdx, status: nextRunStatus, stageStates, stageData, events,
    claims, verifierResults, consensusMap, gateDecision, executorResult, audit, approval: approval || sim.approval,
  };
}

/* ============================== scorecard ============================== */

function computeScorecard({ nodes, objective, findings, claims, consensusMap, gateDecision, audit, hasRun }) {
  const critical = findings.filter((f) => f.severity === 'critical').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;
  const coreEnabled = nodes.filter((n) => n.core && n.enabled).length;
  const coreTotal = nodes.filter((n) => n.core).length || 1;

  const architectureCompleteness = clamp01to100(
    (coreEnabled / coreTotal) * 55 +
    (objective.text.trim() ? 10 : 0) +
    (objective.successCriteria.trim() ? 10 : 0) +
    (objective.output.trim() ? 5 : 0) +
    Math.max(0, 20 - critical * 10 - warnings * 3)
  );

  const totalClaims = claims.length;
  const supportedClaims = claims.filter((c) => computeEvidenceVerifier(c).status !== 'unverifiable').length;
  const claimSupportCoverage = totalClaims ? clamp01to100((supportedClaims / totalClaims) * 100) : 0;

  let agreeCount = 0;
  claims.forEach((c) => {
    const ev = computeEvidenceVerifier(c), gt = computeGroundTruthVerifier(c);
    if (ev.status === gt.status) agreeCount += 1;
    else if ((ev.status === 'confirmed' && gt.status === 'partially_supported') || (gt.status === 'confirmed' && ev.status === 'partially_supported')) agreeCount += 0.5;
  });
  const verifierAgreement = totalClaims ? clamp01to100((agreeCount / totalClaims) * 100) : 0;

  const permissionCompliance = clamp01to100(100 - ((gateDecision && gateDecision.disallowed ? gateDecision.disallowed.length : 0) * 30) - (gateDecision && gateDecision.decision === 'BLOCK' ? 10 : 0));

  const executionAlignment = !hasRun ? 0 : (audit ? (audit.mismatch ? 15 : 100) : 60);
  const auditCoverage = !hasRun ? 0 : (audit ? clamp01to100((totalClaims ? supportedClaims / totalClaims : 1) * 40 + 60) : 0);

  const hasCriticalBlock = critical > 0 || (gateDecision && gateDecision.decision === 'BLOCK') || claims.some((c) => consensusMap[c.id] === 'BLOCK');

  let overallReadiness = Math.round(
    architectureCompleteness * 0.2 + claimSupportCoverage * 0.2 + verifierAgreement * 0.15 +
    permissionCompliance * 0.15 + executionAlignment * 0.15 + auditCoverage * 0.15
  );
  if (hasCriticalBlock) overallReadiness = Math.min(overallReadiness, 35);
  overallReadiness = clamp01to100(overallReadiness);

  const metrics = { architectureCompleteness, claimSupportCoverage, verifierAgreement, permissionCompliance, executionAlignment, auditCoverage };
  const entries = Object.entries(metrics);
  const strongest = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const weakest = entries.reduce((a, b) => (b[1] < a[1] ? b : a));

  let finalStatus;
  if (hasCriticalBlock) finalStatus = 'Blocked';
  else if (!hasRun || !totalClaims) finalStatus = 'Incomplete';
  else if (warnings > 0 || claims.some((c) => consensusMap[c.id] === 'REVISE')) finalStatus = 'Needs Revision';
  else finalStatus = 'Ready';

  const nextStep = hasCriticalBlock
    ? 'Resolve the critical finding or blocked claim before re-running.'
    : finalStatus === 'Needs Revision'
      ? 'Address the open warnings and REVISE-grade claims, then re-verify.'
      : finalStatus === 'Incomplete'
        ? 'Run the simulation and verification to populate a full scorecard.'
        : 'Ready. Consider stress-testing with the adversarial example next.';

  return { ...metrics, overallReadiness, strongestLabel: METRIC_LABELS[strongest[0]], largestRiskLabel: METRIC_LABELS[weakest[0]], finalStatus, nextStep };
}

/* ============================== export builders ============================== */

function buildExportState({ project, objective, nodes, findings, sim, scorecard }) {
  return {
    schemaVersion: '1.0.0',
    project: { name: project.name, exportedAt: nowIso() },
    objective,
    nodes: nodes.map((n) => ({
      id: n.id, name: n.name, category: n.category, responsibility: n.responsibility, instructions: n.instructions,
      expectedInput: n.expectedInput, expectedOutput: n.expectedOutput, allowedTools: n.allowedTools,
      riskLevel: n.riskLevel, retryLimit: n.retryLimit, failureBehavior: n.failureBehavior, core: n.core, enabled: n.enabled,
    })),
    ordering: nodes.map((n) => n.id),
    permissions: { permittedTools: objective.tools, maxRisk: objective.maxRisk },
    findings,
    simulatedRun: sim.stageIndex > -1 ? { status: sim.status, stageStates: sim.stageStates, events: sim.events, gateDecision: sim.gateDecision, executorResult: sim.executorResult } : null,
    claims: sim.claims,
    verifierResults: sim.verifierResults,
    consensus: sim.consensusMap,
    audit: sim.audit,
    scorecard,
  };
}

function toMarkdownReport(state) {
  const lines = [];
  lines.push('# PINCH Architecture Report \u2014 ' + state.project.name);
  lines.push('');
  lines.push('_Generated ' + state.project.exportedAt + '. All results are simulated._');
  lines.push('');
  lines.push('## Objective');
  lines.push(state.objective.text || '_none provided_');
  lines.push('');
  lines.push('## Findings');
  if (!state.findings.length) lines.push('No findings recorded \u2014 run Analyze Architecture first.');
  state.findings.forEach((f) => lines.push('- **[' + f.severity.toUpperCase() + ']** ' + f.explanation + ' \u2192 ' + f.recommendation));
  lines.push('');
  lines.push('## Scorecard');
  Object.keys(METRIC_LABELS).forEach((k) => { if (typeof state.scorecard[k] === 'number') lines.push('- ' + METRIC_LABELS[k] + ': ' + state.scorecard[k] + '%'); });
  lines.push('- Overall Readiness: ' + state.scorecard.overallReadiness + '%');
  lines.push('- Final status: ' + state.scorecard.finalStatus);
  lines.push('- Strongest: ' + state.scorecard.strongestLabel);
  lines.push('- Largest risk: ' + state.scorecard.largestRiskLabel);
  lines.push('- Next step: ' + state.scorecard.nextStep);
  lines.push('');
  lines.push('## Claims & Consensus');
  if (!state.claims.length) lines.push('No claims yet \u2014 run the simulation first.');
  state.claims.forEach((c) => lines.push('- (' + c.criticality + ') ' + c.text + ' \u2014 consensus: ' + (state.consensus[c.id] || 'not yet run')));
  lines.push('');
  lines.push('## Post-Execution Audit');
  if (state.audit) {
    lines.push('- Requested: ' + state.audit.requested);
    lines.push('- Permitted: ' + state.audit.permitted);
    lines.push('- Approved: ' + state.audit.approved);
    lines.push('- Attempted: ' + state.audit.attempted);
    lines.push('- Simulated result: ' + state.audit.simulatedResult);
    lines.push('- Claimed result: ' + state.audit.claimedResult);
    lines.push('- Mismatch: ' + (state.audit.mismatch ? 'YES \u2014 ' + state.audit.note : 'no'));
  } else {
    lines.push('No audit recorded yet \u2014 run the simulation through the Post-Execution Auditor stage.');
  }
  return lines.join('\n');
}

/* ============================== small UI atoms ============================== */

function IconBtn({ icon: Icon, label, onClick, active, disabled, title, variant }) {
  return (
    <button
      type="button"
      className={clsx('icon-btn', active && 'is-active', variant && 'v-' + variant)}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title || label}
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

function Badge({ children, tone }) {
  return <span className={clsx('badge', tone && 'tone-' + tone)}>{children}</span>;
}

function StatusPill({ status, small }) {
  const meta = STAGE_STATUS[status] || STAGE_STATUS.idle;
  const Icon = meta.icon;
  return (
    <span className={clsx('status-pill', meta.cls, small && 'is-small')}>
      <Icon size={small ? 11 : 12} className={status === 'running' ? 'spin' : ''} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function ConsensusPill({ value }) {
  const meta = CONSENSUS_META[value] || { label: value || 'Not run', cls: 'st-idle' };
  return <span className={clsx('status-pill', meta.cls)}>{meta.label}</span>;
}

function VerifierPill({ value }) {
  const meta = VERIFIER_STATUS_META[value] || { label: value, cls: 'st-idle' };
  return <span className={clsx('status-pill', 'is-small', meta.cls)}>{meta.label}</span>;
}

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={clsx('toggle', checked && 'is-on')}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

function InfoTip({ term }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const text = TOOLTIP_TERMS[term] || '';
  if (!text) return null;
  return (
    <span className="infotip" ref={ref}>
      <button type="button" className="infotip-btn" aria-label={'What is this?'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Info size={12} aria-hidden="true" />
      </button>
      {open && <span role="tooltip" className="infotip-panel">{text}</span>}
    </span>
  );
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={clsx('toast', 'tone-' + t.tone)} role="status">
          {t.tone === 'ok' && <CheckCircle2 size={15} aria-hidden="true" />}
          {t.tone === 'warn' && <AlertTriangle size={15} aria-hidden="true" />}
          {t.tone === 'bad' && <XCircle size={15} aria-hidden="true" />}
          {t.tone === 'info' && <Info size={15} aria-hidden="true" />}
          <span>{t.message}</span>
          <button type="button" aria-label="Dismiss" className="toast-x" onClick={() => onDismiss(t.id)}><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement;
    if (ref.current) ref.current.focus();
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={clsx('modal', wide && 'is-wide')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <IconBtn icon={X} label="Close dialog" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, danger }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="confirm-msg">{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="button" className={clsx('btn', danger ? 'btn-danger' : 'btn-primary')} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

function SegmentedTabs({ tabs, active, onChange }) {
  return (
    <div className="tabbar" role="tablist" aria-label="Workspace sections">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={clsx('tab-btn', active === t.id && 'is-active')}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="empty-state">
      <Icon size={26} aria-hidden="true" />
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}

function FieldLabel({ children, term }) {
  return (
    <span className="field-label">
      {children}
      {term && <InfoTip term={term} />}
    </span>
  );
}

/* ============================== top bar ============================== */

function TopBar({ projectName, onRenameProject, badgeStatus, badgeLabel, onNew, onLoadExample, onSave, onExport, theme, onToggleTheme, onAbout, sidebarOpen, onToggleSidebar, inspectorOpen, onToggleInspector, hasInspectorTarget }) {
  return (
    <header className="topbar">
      <button type="button" className="icon-btn only-narrow" aria-label="Toggle node list" onClick={onToggleSidebar}>
        <Layers size={16} />
      </button>
      <div className="topbar-brand">
        <Workflow size={18} aria-hidden="true" />
        <span className="brand-name">PINCH Workflow Studio</span>
      </div>
      <div className="topbar-project">
        <input
          className="project-name-input"
          value={projectName}
          onChange={(e) => onRenameProject(e.target.value)}
          aria-label="Project name"
          maxLength={60}
        />
      </div>
      <span className={clsx('sim-badge', 'tone-' + badgeStatus)}>{badgeLabel}</span>
      <div className="topbar-actions">
        <button type="button" className="btn btn-ghost" onClick={onNew}><FilePlus size={14} /> New</button>
        <button type="button" className="btn btn-ghost" onClick={onLoadExample}><FolderOpen size={14} /> Load Example</button>
        <button type="button" className="btn btn-ghost" onClick={onSave}><Save size={14} /> Save</button>
        <button type="button" className="btn btn-primary" onClick={onExport}><Download size={14} /> Export</button>
        <IconBtn icon={HelpCircle} label="About this simulation" onClick={onAbout} />
        <IconBtn icon={theme === 'dark' ? Sun : Moon} label="Toggle theme" onClick={onToggleTheme} />
        {hasInspectorTarget && (
          <button type="button" className="icon-btn only-narrow" aria-label="Toggle inspector" onClick={onToggleInspector}>
            <Settings2 size={16} />
          </button>
        )}
      </div>
    </header>
  );
}

/* ============================== sidebar / node list ============================== */

function NodeCard({ node, selected, status, warningCount, onSelect, onToggleEnabled, onDuplicate, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const cat = CATEGORIES[node.category] || CATEGORIES.generator;
  const Icon = ICON_MAP[node.icon] || cat.icon;
  return (
    <div className={clsx('node-card', cat.cls, selected && 'is-selected', !node.enabled && 'is-disabled')}>
      <button type="button" className="node-card-main" onClick={() => onSelect(node.id)} aria-pressed={selected}>
        <span className="node-icon"><Icon size={15} aria-hidden="true" /></span>
        <span className="node-meta">
          <span className="node-name">{node.name}{node.locked && <Lock size={10} className="lock-ico" aria-label="Protected node" />}</span>
          <span className="node-cat">{cat.label} \u00b7 {truncate(node.responsibility, 46)}</span>
        </span>
      </button>
      <div className="node-card-side">
        {warningCount > 0 && <span className="warn-count" title={warningCount + ' finding(s)'}><AlertTriangle size={11} /> {warningCount}</span>}
        <StatusPill status={status} small />
      </div>
      <div className="node-card-tools">
        <Toggle checked={node.enabled} onChange={() => onToggleEnabled(node.id)} label={'Enable ' + node.name} />
        {node.custom && (
          <>
            <IconBtn icon={ArrowUp} label={'Move ' + node.name + ' up'} onClick={() => onMoveUp(node.id)} disabled={!canMoveUp} />
            <IconBtn icon={ArrowDown} label={'Move ' + node.name + ' down'} onClick={() => onMoveDown(node.id)} disabled={!canMoveDown} />
            <IconBtn icon={Copy} label={'Duplicate ' + node.name} onClick={() => onDuplicate(node.id)} />
            <IconBtn icon={Trash2} label={'Delete ' + node.name} onClick={() => onDelete(node.id)} variant="danger" />
          </>
        )}
      </div>
    </div>
  );
}

function AddAgentForm({ nodes, onAdd, onCancel }) {
  const gateIdx = nodes.findIndex((n) => n.id === 'permission_gate');
  const options = nodes.slice(0, gateIdx === -1 ? nodes.length : gateIdx);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('generator');
  const [responsibility, setResponsibility] = useState('');
  const [afterId, setAfterId] = useState(options.length ? options[options.length - 1].id : '');

  return (
    <form
      className="add-agent-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd({ name: name.trim(), category, responsibility: responsibility.trim(), afterId });
      }}
    >
      <label className="form-row">
        <FieldLabel>Agent name</FieldLabel>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Style Checker" autoFocus />
      </label>
      <label className="form-row">
        <FieldLabel>Category</FieldLabel>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.keys(CATEGORIES).map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
        </select>
      </label>
      <label className="form-row">
        <FieldLabel>Responsibility</FieldLabel>
        <textarea value={responsibility} onChange={(e) => setResponsibility(e.target.value)} rows={2} placeholder="What does this agent do?" />
      </label>
      <label className="form-row">
        <FieldLabel>Insert after</FieldLabel>
        <select value={afterId} onChange={(e) => setAfterId(e.target.value)}>
          {options.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      </label>
      <p className="form-hint">Custom agents can only sit before the Permission Gate, so the safety chain always runs last.</p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Add agent</button>
      </div>
    </form>
  );
}

function Sidebar({ nodes, selectedNodeId, stageStates, findingsByNode, open, onSelect, onToggleEnabled, onDuplicate, onDelete, onMove, onAddClick, showAddForm, onAddAgent, onCancelAdd }) {
  const gateIdx = nodes.findIndex((n) => n.id === 'permission_gate');
  return (
    <aside className={clsx('sidebar', open && 'is-open')} aria-label="Workflow stages">
      <div className="sidebar-head">
        <h2>Workflow stages</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onAddClick}><Plus size={13} /> Add agent</button>
      </div>
      {showAddForm && <AddAgentForm nodes={nodes} onAdd={onAddAgent} onCancel={onCancelAdd} />}
      <div className="node-list">
        {nodes.map((node, i) => {
          const lowerBound = 1;
          const upperBound = gateIdx === -1 ? nodes.length - 1 : gateIdx - 1;
          return (
            <NodeCard
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              status={stageStates[node.id] || 'idle'}
              warningCount={(findingsByNode[node.id] || []).length}
              onSelect={onSelect}
              onToggleEnabled={onToggleEnabled}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onMoveUp={(id) => onMove(id, -1)}
              onMoveDown={(id) => onMove(id, 1)}
              canMoveUp={node.custom && i > lowerBound}
              canMoveDown={node.custom && i < upperBound}
            />
          );
        })}
      </div>
    </aside>
  );
}

/* ============================== inspector ============================== */

function Inspector({ node, open, onChange, onClose }) {
  if (!node) {
    return (
      <aside className={clsx('inspector', open && 'is-open')} aria-label="Node inspector">
        <EmptyState icon={Settings2} title="No node selected" hint="Select a stage from the list to view and edit its settings." />
      </aside>
    );
  }
  const cat = CATEGORIES[node.category] || CATEGORIES.generator;
  const set = (patch) => onChange(node.id, patch);
  return (
    <aside className={clsx('inspector', open && 'is-open')} aria-label="Node inspector">
      <div className="inspector-head">
        <span className={clsx('cat-chip', cat.cls)}>{cat.label}</span>
        <button type="button" className="icon-btn only-narrow" aria-label="Close inspector" onClick={onClose}><X size={16} /></button>
      </div>
      <label className="form-row">
        <FieldLabel>Name</FieldLabel>
        <input value={node.name} onChange={(e) => set({ name: e.target.value })} disabled={node.locked} />
      </label>
      <label className="form-row">
        <FieldLabel>Role / category</FieldLabel>
        <select value={node.category} onChange={(e) => set({ category: e.target.value })} disabled={node.locked}>
          {Object.keys(CATEGORIES).map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
        </select>
      </label>
      <label className="form-row">
        <FieldLabel>Responsibility</FieldLabel>
        <textarea rows={2} value={node.responsibility} onChange={(e) => set({ responsibility: e.target.value })} />
      </label>
      <label className="form-row">
        <FieldLabel term={TOOLTIP_TERMS[node.id] ? node.id : undefined}>Instructions</FieldLabel>
        <textarea rows={3} value={node.instructions} onChange={(e) => set({ instructions: e.target.value })} />
      </label>
      <div className="form-grid-2">
        <label className="form-row">
          <FieldLabel>Expected input</FieldLabel>
          <input value={node.expectedInput} onChange={(e) => set({ expectedInput: e.target.value })} />
        </label>
        <label className="form-row">
          <FieldLabel>Expected output</FieldLabel>
          <input value={node.expectedOutput} onChange={(e) => set({ expectedOutput: e.target.value })} />
        </label>
      </div>
      <label className="form-row">
        <FieldLabel>Allowed tools (comma separated)</FieldLabel>
        <input
          value={(node.allowedTools || []).join(', ')}
          onChange={(e) => set({ allowedTools: parseToolList(e.target.value) })}
        />
      </label>
      <div className="form-grid-2">
        <label className="form-row">
          <FieldLabel>Risk level</FieldLabel>
          <select value={node.riskLevel} onChange={(e) => set({ riskLevel: e.target.value })}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
        </label>
        <label className="form-row">
          <FieldLabel>Retry limit</FieldLabel>
          <input type="number" min={0} max={10} value={node.retryLimit} onChange={(e) => set({ retryLimit: Number(e.target.value) })} />
        </label>
      </div>
      <label className="form-row">
        <FieldLabel>Failure behavior</FieldLabel>
        <select value={node.failureBehavior || 'halt'} onChange={(e) => set({ failureBehavior: e.target.value })}>
          <option value="halt">Halt</option>
          <option value="retry_then_halt">Retry, then halt</option>
          <option value="skip">Skip stage</option>
          <option value="escalate">Escalate to human</option>
        </select>
      </label>
      <div className="form-row form-row-inline">
        <FieldLabel>Enabled</FieldLabel>
        <Toggle checked={node.enabled} onChange={(v) => set({ enabled: v })} label={'Enable ' + node.name} />
      </div>
      {node.locked && <p className="form-hint"><Lock size={11} /> This is a core PINCH stage. It can be disabled for testing but not deleted.</p>}
    </aside>
  );
}

/* ============================== design tab ============================== */

function PipelineFlow({ nodes, stageStates, selectedNodeId, onSelect, currentStageId }) {
  return (
    <div className="pipeline-flow" role="list" aria-label="Pipeline order">
      {nodes.map((node, i) => {
        const cat = CATEGORIES[node.category] || CATEGORIES.generator;
        const Icon = ICON_MAP[node.icon] || cat.icon;
        const status = stageStates[node.id] || 'idle';
        return (
          <React.Fragment key={node.id}>
            <button
              type="button"
              role="listitem"
              className={clsx('flow-card', cat.cls, !node.enabled && 'is-disabled', selectedNodeId === node.id && 'is-selected', currentStageId === node.id && 'is-current')}
              onClick={() => onSelect(node.id)}
            >
              <span className="flow-card-icon"><Icon size={16} aria-hidden="true" /></span>
              <span className="flow-card-name">{node.name}</span>
              <StatusPill status={status} small />
            </button>
            {i < nodes.length - 1 && <ChevronRight className="flow-arrow" size={16} aria-hidden="true" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FindingsPanel({ findings, onApplyFixes, fixableCount, hasAnalyzed }) {
  const [filter, setFilter] = useState('all');
  if (!hasAnalyzed) {
    return <EmptyState icon={ShieldCheck} title="No analysis yet" hint='Click "Analyze Architecture" to run the 15 deterministic structural checks.' />;
  }
  const filtered = filter === 'all' ? findings : findings.filter((f) => f.severity === filter);
  const counts = { critical: findings.filter((f) => f.severity === 'critical').length, warning: findings.filter((f) => f.severity === 'warning').length, info: findings.filter((f) => f.severity === 'info').length };
  return (
    <div className="findings-panel">
      <div className="findings-toolbar">
        <div className="chip-filters" role="group" aria-label="Filter findings">
          {['all', 'critical', 'warning', 'info'].map((f) => (
            <button key={f} type="button" className={clsx('chip', filter === f && 'is-active')} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' ? '(' + counts[f] + ')' : '(' + findings.length + ')'}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={onApplyFixes} disabled={fixableCount === 0}>
          <ShieldCheck size={13} /> Apply Safe Fixes {fixableCount > 0 ? '(' + fixableCount + ')' : ''}
        </button>
      </div>
      {filtered.length === 0 ? (
        <p className="muted-note">No {filter === 'all' ? '' : filter} findings. {findings.length === 0 ? 'Architecture looks structurally sound.' : ''}</p>
      ) : (
        <ul className="findings-list">
          {filtered.map((f) => (
            <li key={f.id} className={clsx('finding-row', 'sev-' + f.severity)}>
              {f.severity === 'critical' && <OctagonAlert size={15} aria-hidden="true" />}
              {f.severity === 'warning' && <AlertTriangle size={15} aria-hidden="true" />}
              {f.severity === 'info' && <Info size={15} aria-hidden="true" />}
              <div>
                <p className="finding-explain">{f.explanation}</p>
                <p className="finding-rec">{f.recommendation}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DesignTab({ objective, onObjectiveChange, nodes, stageStates, selectedNodeId, onSelectNode, onGenerate, onAnalyze, onApplyFixes, onResetClick, findings, hasAnalyzed, fixableCount }) {
  const set = (k) => (e) => onObjectiveChange({ ...objective, [k]: e.target.value });
  return (
    <div className="design-tab">
      <section className="panel">
        <h2 className="panel-title"><Target size={16} /> Objective Canvas</h2>
        <label className="form-row">
          <FieldLabel>Objective</FieldLabel>
          <textarea rows={2} value={objective.text} onChange={set('text')} placeholder="What should this workflow accomplish?" />
        </label>
        <div className="form-grid-2">
          <label className="form-row">
            <FieldLabel>Intended output</FieldLabel>
            <input value={objective.output} onChange={set('output')} placeholder="The concrete artifact produced" />
          </label>
          <label className="form-row">
            <FieldLabel>Audience</FieldLabel>
            <input value={objective.audience} onChange={set('audience')} placeholder="Who is this for?" />
          </label>
        </div>
        <div className="form-grid-2">
          <label className="form-row">
            <FieldLabel>Constraints</FieldLabel>
            <textarea rows={2} value={objective.constraints} onChange={set('constraints')} placeholder="Hard limits the workflow must respect" />
          </label>
          <label className="form-row">
            <FieldLabel>Success criteria</FieldLabel>
            <textarea rows={2} value={objective.successCriteria} onChange={set('successCriteria')} placeholder="How you'll know the output is good enough" />
          </label>
        </div>
        <div className="form-grid-2">
          <label className="form-row">
            <FieldLabel>Permitted tools</FieldLabel>
            <input value={objective.tools} onChange={set('tools')} placeholder="e.g. web_search, code_exec" />
          </label>
          <label className="form-row">
            <FieldLabel>Maximum risk level</FieldLabel>
            <select value={objective.maxRisk} onChange={set('maxRisk')}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </label>
        </div>
        <div className="panel-actions">
          <button type="button" className="btn btn-primary" onClick={onGenerate}><Sparkles size={14} /> Generate Workflow</button>
          <button type="button" className="btn" onClick={onAnalyze}><ShieldCheck size={14} /> Analyze Architecture</button>
          <button type="button" className="btn btn-ghost" onClick={onResetClick}><RotateCcw size={14} /> Reset</button>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title"><Workflow size={16} /> Pipeline</h2>
        <PipelineFlow nodes={nodes} stageStates={stageStates} selectedNodeId={selectedNodeId} onSelect={onSelectNode} currentStageId={null} />
      </section>

      <section className="panel">
        <h2 className="panel-title"><OctagonAlert size={16} /> Architecture analysis</h2>
        <FindingsPanel findings={findings} onApplyFixes={onApplyFixes} fixableCount={fixableCount} hasAnalyzed={hasAnalyzed} />
      </section>
    </div>
  );
}

/* ============================== simulate tab ============================== */

function SimControls({ sim, onRun, onPause, onContinue, onStep, onCancel, onReset, activeCount }) {
  const isRunning = sim.status === 'running';
  const isPaused = sim.status === 'paused';
  const isDone = sim.status === 'completed';
  const isWaiting = sim.status === 'awaiting_approval';
  const notStarted = sim.stageIndex === -1;
  return (
    <div className="sim-controls">
      {!isRunning ? (
        <button type="button" className="btn btn-primary" onClick={onRun} disabled={isWaiting || activeCount === 0}>
          <Play size={14} /> {notStarted ? 'Run Simulation' : isDone ? 'Run Again' : 'Resume Run'}
        </button>
      ) : (
        <button type="button" className="btn" onClick={onPause}><Pause size={14} /> Pause</button>
      )}
      <button type="button" className="btn" onClick={onContinue} disabled={isRunning || isWaiting || notStarted || isDone} title={isWaiting ? 'Resolve the approval below first' : undefined}>
        <ChevronRight size={14} /> Continue
      </button>
      <button type="button" className="btn" onClick={onStep} disabled={isRunning || isWaiting || isDone} title={isWaiting ? 'Resolve the approval below first' : undefined}>
        <SkipForward size={14} /> Step
      </button>
      <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={notStarted || isDone}><Square size={13} /> Cancel</button>
      <button type="button" className="btn btn-ghost" onClick={onReset} disabled={notStarted}><RotateCcw size={14} /> Reset Run</button>
    </div>
  );
}

function ApprovalPanel({ approval, onApprove, onReject, onRevise }) {
  if (!approval) return null;
  return (
    <div className="approval-panel" role="alertdialog" aria-label="Permission Gate approval required">
      <div className="approval-head"><HelpCircle size={16} /> <strong>Permission Gate needs a decision</strong></div>
      <dl className="approval-grid">
        <dt>Requested tool</dt><dd>{approval.tool}</dd>
        <dt>Purpose</dt><dd>{approval.purpose}</dd>
        <dt>Proposed arguments</dt><dd className="mono">{JSON.stringify(approval.args)}</dd>
        <dt>Risk</dt><dd><Badge tone={approval.risk === 'high' ? 'bad' : approval.risk === 'medium' ? 'warn' : 'ok'}>{approval.risk}</Badge></dd>
        <dt>Authorization scope</dt><dd>{approval.scope}</dd>
      </dl>
      <div className="approval-actions">
        <button type="button" className="btn btn-primary" onClick={onApprove}><ThumbsUp size={14} /> Approve Once</button>
        <button type="button" className="btn btn-danger" onClick={onReject}><ThumbsDown size={14} /> Reject</button>
        <button type="button" className="btn" onClick={onRevise}><RotateCcw size={14} /> Request Revision</button>
      </div>
    </div>
  );
}

function StageDetail({ node, status, data }) {
  if (!node) return <EmptyState icon={Gauge} title="No stage selected" hint="Pick a stage from the timeline to inspect its input, output, and duration." />;
  return (
    <div className="stage-detail">
      <div className="stage-detail-head">
        <strong>{node.name}</strong>
        <StatusPill status={status} />
      </div>
      {data ? (
        <dl className="approval-grid">
          <dt>Input</dt><dd>{data.input}</dd>
          <dt>Output</dt><dd>{data.output}</dd>
          <dt>Duration</dt><dd>{data.duration} ms (simulated)</dd>
          {data.reason && <><dt>Reason</dt><dd>{data.reason}</dd></>}
        </dl>
      ) : <p className="muted-note">This stage has not run yet.</p>}
    </div>
  );
}

function EventTimeline({ events, onSelectNode, nodesById }) {
  if (!events.length) return <p className="muted-note">No events yet. Run or step the simulation to populate the timeline.</p>;
  return (
    <ol className="event-timeline">
      {events.slice().reverse().map((e) => {
        const n = nodesById[e.nodeId];
        return (
          <li key={e.id} className={clsx('event-row', 'ev-' + e.type)}>
            <button type="button" className="event-node-btn" onClick={() => onSelectNode(e.nodeId)}>{n ? n.name : e.nodeId}</button>
            <span className="event-msg">{e.message}</span>
            <time className="event-time">{new Date(e.time).toLocaleTimeString()}</time>
          </li>
        );
      })}
    </ol>
  );
}

function SimulateTab({ nodes, sim, onRun, onPause, onContinue, onStep, onCancel, onResetClick, onApprove, onReject, onRevise, selectedStageId, onSelectStage }) {
  const activeNodes = nodes.filter((n) => n.enabled);
  const total = activeNodes.length;
  const progress = total ? Math.min(100, Math.round(((sim.stageIndex + 1) / total) * 100)) : 0;
  const currentNode = sim.stageIndex >= 0 && sim.stageIndex < activeNodes.length ? activeNodes[sim.stageIndex] : null;
  const detailNode = selectedStageId ? nodes.find((n) => n.id === selectedStageId) : currentNode;
  const nodesById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <div className="simulate-tab">
      <section className="panel">
        <h2 className="panel-title"><Play size={16} /> Simulation console</h2>
        <SimControls sim={sim} onRun={onRun} onPause={onPause} onContinue={onContinue} onStep={onStep} onCancel={onCancel} onReset={onResetClick} activeCount={total} />
        <div className="progress-row">
          <div className="progress-track"><div className="progress-fill" style={{ width: progress + '%' }} /></div>
          <span className="progress-label">{sim.stageIndex + 1 < 0 ? 0 : Math.min(sim.stageIndex + 1, total)} / {total} stages</span>
        </div>
        <p className="sim-current-label">
          Current stage: <strong>{currentNode ? currentNode.name : sim.status === 'completed' ? 'Run complete' : 'Not started'}</strong>
          <span className={clsx('sim-status-word', 'tone-' + sim.status)}> ({sim.status.replace('_', ' ')})</span>
        </p>
        <PipelineFlow nodes={nodes} stageStates={sim.stageStates} selectedNodeId={selectedStageId} onSelect={onSelectStage} currentStageId={currentNode ? currentNode.id : null} />
      </section>

      <ApprovalPanel approval={sim.approval} onApprove={onApprove} onReject={onReject} onRevise={onRevise} />

      <div className="two-col">
        <section className="panel">
          <h2 className="panel-title"><History size={16} /> Event timeline</h2>
          <EventTimeline events={sim.events} onSelectNode={onSelectStage} nodesById={nodesById} />
        </section>
        <section className="panel">
          <h2 className="panel-title"><Gauge size={16} /> Stage detail</h2>
          <StageDetail node={detailNode} status={detailNode ? (sim.stageStates[detailNode.id] || 'idle') : 'idle'} data={detailNode ? sim.stageData[detailNode.id] : null} />
        </section>
      </div>
    </div>
  );
}

/* ============================== verify tab ============================== */

function ClaimRow({ claim, ev, gt, consensus, expanded, onToggle }) {
  return (
    <li className={clsx('claim-row', expanded && 'is-expanded')}>
      <div
        className="claim-row-head" onClick={onToggle} aria-expanded={expanded}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      >
        <ChevronRight size={14} className={clsx('chev', expanded && 'is-rot')} />
        <span className="claim-id mono">{claim.id}</span>
        <Badge tone={claim.criticality === 'critical' ? 'bad' : claim.criticality === 'medium' ? 'warn' : 'neutral'}>
          {claim.criticality} <InfoTip term="criticality" />
        </Badge>
        <span className="claim-text">{claim.text}</span>
        <ConsensusPill value={consensus} />
      </div>
      {expanded && (
        <div className="claim-row-body">
          <dl className="approval-grid">
            <dt>Source stage</dt><dd>{claim.sourceStage}</dd>
            <dt>Generator confidence</dt><dd>{Math.round(claim.generatorConfidence * 100)}% (not independent verification)</dd>
            <dt>Evidence references</dt><dd>{claim.evidence.length ? claim.evidence.join(', ') : 'none'}</dd>
            <dt>Evidence Verifier</dt><dd><VerifierPill value={ev.status} /> {ev.rationale}</dd>
            <dt>Ground-Truth Verifier</dt><dd><VerifierPill value={gt.status} /> {gt.rationale}</dd>
            <dt>Unresolved reason</dt><dd>{consensus === 'UNRESOLVED' || consensus === 'BLOCK' ? (ev.rationale + ' / ' + gt.rationale) : 'n/a'}</dd>
          </dl>
        </div>
      )}
    </li>
  );
}

function ClaimMap({ claims, verifierResults, consensusMap }) {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  if (!claims.length) {
    return <EmptyState icon={Puzzle} title="No claims yet" hint="Run the simulation through the Generator and Semantic Claim Mapper to populate this map." />;
  }
  const filtered = claims.filter((c) => {
    const consensus = consensusMap[c.id];
    if (filter === 'all') return true;
    if (filter === 'passed') return consensus === 'PASS';
    if (filter === 'unresolved') return consensus === 'UNRESOLVED' || !consensus;
    if (filter === 'critical') return c.criticality === 'critical';
    return true;
  });
  return (
    <div>
      <div className="chip-filters" role="group" aria-label="Filter claims">
        {['all', 'passed', 'unresolved', 'critical'].map((f) => (
          <button key={f} type="button" className={clsx('chip', filter === f && 'is-active')} onClick={() => setFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      <ul className="claim-list">
        {filtered.map((c) => {
          const ev = (verifierResults[c.id] && verifierResults[c.id].evidence) || computeEvidenceVerifier(c);
          const gt = (verifierResults[c.id] && verifierResults[c.id].groundTruth) || computeGroundTruthVerifier(c);
          const consensus = consensusMap[c.id];
          return (
            <ClaimRow key={c.id} claim={c} ev={ev} gt={gt} consensus={consensus} expanded={expandedId === c.id} onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)} />
          );
        })}
        {filtered.length === 0 && <p className="muted-note">No claims match this filter.</p>}
      </ul>
    </div>
  );
}

function DualVerifierPanel({ claims, verifierResults }) {
  if (!claims.length) return <EmptyState icon={Scale} title="No claims to verify yet" hint="Verifier results appear once the simulation reaches the two verifier stages." />;
  return (
    <div className="two-col">
      {['evidence', 'groundTruth'].map((kind) => (
        <div key={kind} className="verifier-col">
          <h3 className="verifier-col-title">
            {kind === 'evidence' ? <Scale size={14} /> : <Database size={14} />}
            {kind === 'evidence' ? 'Evidence Verifier' : 'Ground-Truth Verifier'}
            <InfoTip term={kind === 'evidence' ? 'evidence_verifier' : 'ground_truth_verifier'} />
          </h3>
          <ul className="verifier-list">
            {claims.map((c) => {
              const res = (verifierResults[c.id] && verifierResults[c.id][kind]) || (kind === 'evidence' ? computeEvidenceVerifier(c) : computeGroundTruthVerifier(c));
              return (
                <li key={c.id} className="verifier-item">
                  <div className="verifier-item-head"><span className="claim-id mono">{c.id}</span><VerifierPill value={res.status} /></div>
                  <p className="verifier-rationale">{res.rationale}</p>
                  <p className="verifier-sub">Support: {res.support} \u00b7 Uncertainty: {res.uncertainty}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AuditPanel({ audit }) {
  if (!audit) return <EmptyState icon={ClipboardCheck} title="No audit yet" hint="The Post-Execution Auditor runs after the Bounded Executor stage." />;
  return (
    <div className={clsx('audit-panel', audit.mismatch && 'has-mismatch')}>
      {audit.mismatch && <p className="audit-flag"><OctagonAlert size={15} /> Mismatch detected between the claimed result and the actual outcome.</p>}
      <dl className="approval-grid">
        <dt>Requested action</dt><dd>{audit.requested}</dd>
        <dt>Permitted action</dt><dd>{audit.permitted}</dd>
        <dt>Approved action</dt><dd>{audit.approved}</dd>
        <dt>Attempted action</dt><dd>{audit.attempted}</dd>
        <dt>Simulated result</dt><dd>{audit.simulatedResult}</dd>
        <dt>Claimed result</dt><dd>{audit.claimedResult}</dd>
      </dl>
    </div>
  );
}

function ScorecardPanel({ scorecard }) {
  const metricEntries = Object.keys(METRIC_LABELS).map((k) => [k, scorecard[k]]);
  return (
    <div className="scorecard">
      <div className="scorecard-head">
        <span className={clsx('final-status', 'tone-' + scorecard.finalStatus.toLowerCase().replace(' ', '-'))}>{scorecard.finalStatus}</span>
        <div className="overall-ring" aria-label={'Overall readiness ' + scorecard.overallReadiness + ' percent'}>
          <span className="overall-num">{scorecard.overallReadiness}%</span>
          <span className="overall-label">Overall Readiness</span>
        </div>
      </div>
      <div className="metric-grid">
        {metricEntries.map(([k, v]) => (
          <div key={k} className="metric-cell">
            <div className="metric-top"><span>{METRIC_LABELS[k]}</span><span>{v}%</span></div>
            <div className="metric-track"><div className="metric-fill" style={{ width: v + '%' }} /></div>
          </div>
        ))}
      </div>
      <dl className="approval-grid">
        <dt>Strongest part</dt><dd>{scorecard.strongestLabel}</dd>
        <dt>Largest risk</dt><dd>{scorecard.largestRiskLabel}</dd>
        <dt>Next recommended step</dt><dd>{scorecard.nextStep}</dd>
      </dl>
    </div>
  );
}

function VerifyTab({ claims, verifierResults, consensusMap, audit, scorecard }) {
  return (
    <div className="verify-tab">
      <section className="panel">
        <h2 className="panel-title"><Puzzle size={16} /> Claim map</h2>
        <ClaimMap claims={claims} verifierResults={verifierResults} consensusMap={consensusMap} />
      </section>
      <section className="panel">
        <h2 className="panel-title"><Scale size={16} /> Dual-verifier panel</h2>
        <DualVerifierPanel claims={claims} verifierResults={verifierResults} />
      </section>
      <section className="panel">
        <h2 className="panel-title"><ClipboardCheck size={16} /> Post-execution audit</h2>
        <AuditPanel audit={audit} />
      </section>
      <section className="panel">
        <h2 className="panel-title"><Gauge size={16} /> PINCH scorecard</h2>
        <ScorecardPanel scorecard={scorecard} />
      </section>
    </div>
  );
}

/* ============================== export tab ============================== */

function ExportTab({ exportState, markdown, onCopyJson, onDownloadJson, onCopyMd, onDownloadMd }) {
  const jsonText = useMemo(() => JSON.stringify(exportState, null, 2), [exportState]);
  const [view, setView] = useState('json');
  return (
    <div className="export-tab">
      <section className="panel">
        <h2 className="panel-title"><Download size={16} /> Export</h2>
        <div className="chip-filters" role="group" aria-label="Choose export preview">
          <button type="button" className={clsx('chip', view === 'json' && 'is-active')} onClick={() => setView('json')}><FileJson size={13} /> Workflow JSON</button>
          <button type="button" className={clsx('chip', view === 'md' && 'is-active')} onClick={() => setView('md')}><FileText size={13} /> Markdown report</button>
        </div>
        {view === 'json' ? (
          <>
            <div className="panel-actions">
              <button type="button" className="btn" onClick={onCopyJson}><Copy size={14} /> Copy JSON</button>
              <button type="button" className="btn btn-primary" onClick={onDownloadJson}><Download size={14} /> Download JSON</button>
            </div>
            <pre className="code-preview" tabIndex={0}>{jsonText}</pre>
          </>
        ) : (
          <>
            <div className="panel-actions">
              <button type="button" className="btn" onClick={onCopyMd}><Copy size={14} /> Copy Markdown</button>
              <button type="button" className="btn btn-primary" onClick={onDownloadMd}><Download size={14} /> Download Markdown</button>
            </div>
            <pre className="code-preview" tabIndex={0}>{markdown}</pre>
          </>
        )}
        <p className="muted-note">Exports never include secrets or credentials \u2014 this Artifact never collects them.</p>
      </section>
    </div>
  );
}

/* ============================== example picker & about dialog ============================== */

function ExamplePicker({ onPick, onClose }) {
  return (
    <Modal title="Load a seeded example" onClose={onClose} wide>
      <div className="example-grid">
        {EXAMPLES.map((ex) => (
          <button type="button" key={ex.id} className={clsx('example-card', ex.id === 'adversarial' && 'is-adversarial')} onClick={() => onPick(ex)}>
            <strong>{ex.label}</strong>
            <p>{ex.description}</p>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function AboutDialog({ onClose }) {
  return (
    <Modal title="About this simulation" onClose={onClose}>
      <ul className="about-list">
        <li>Every agent run, verifier verdict, and executor result on this page is a deterministic simulation. The same workflow and objective will always produce the same outcome.</li>
        <li>Nothing here calls a real model, a real tool, or the network. "Web search," "code exec," and similar tool names are simulated labels, not live integrations.</li>
        <li>PINCH is treated here as a proposed engineering framework, not a proven or universally reliable one.</li>
        <li>Session data lives only in this browser tab's memory. Reloading the page or starting a new chat clears it \u2014 use Export to keep a copy.</li>
        <li>"Save" checkpoints the current state for this session only; it is not durable storage.</li>
      </ul>
    </Modal>
  );
}

/* ============================== app root ============================== */

const RUN_STATUS_LABEL = { idle: 'Idle', running: 'Running', paused: 'Paused', awaiting_approval: 'Awaiting approval', completed: 'Completed' };
const RUN_BADGE_TONE = { idle: 'neutral', running: 'accent', paused: 'warn', awaiting_approval: 'warn', completed: 'ok' };
const BLANK_OBJECTIVE = { text: '', output: '', audience: '', constraints: '', successCriteria: '', tools: '', maxRisk: 'low' };
const FIXABLE_PREFIXES = ['disabled-verifier-', 'retries-', 'tool-'];
const FIXABLE_EXACT = ['missing-consensus', 'missing-permission-gate', 'missing-auditor', 'no-failure-path', 'generator-to-executor', 'executor-before-gate'];
function isFixable(f) { return FIXABLE_EXACT.indexOf(f.id) !== -1 || FIXABLE_PREFIXES.some((p) => f.id.indexOf(p) === 0); }

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [projectName, setProjectName] = useState('Untitled PINCH Workflow');
  const [objective, setObjective] = useState(BLANK_OBJECTIVE);
  const [nodes, setNodes] = useState(() => makeCoreNodes());
  const [lastMatchedDomains, setLastMatchedDomains] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeTab, setActiveTab] = useState('design');
  const [findings, setFindings] = useState([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [sim, setSim] = useState(initialSimState);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [showExamplePicker, setShowExamplePicker] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const savedSnapshotRef = useRef(null);

  const pushToast = (tone, message) => {
    const id = uid('toast');
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  /* ---- derived ---- */
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const findingsByNode = useMemo(() => {
    const m = {};
    findings.forEach((f) => { if (f.nodeId) (m[f.nodeId] = m[f.nodeId] || []).push(f); });
    return m;
  }, [findings]);
  const fixableCount = useMemo(() => findings.filter(isFixable).length, [findings]);
  const liveFindings = useMemo(
    () => analyzeArchitecture({ nodes, objective, claims: sim.claims, consensusMap: sim.consensusMap }),
    [nodes, objective, sim.claims, sim.consensusMap]
  );
  const hasRun = sim.stageIndex > -1;
  const scorecard = useMemo(
    () => computeScorecard({ nodes, objective, findings: liveFindings, claims: sim.claims, consensusMap: sim.consensusMap, gateDecision: sim.gateDecision, audit: sim.audit, hasRun }),
    [nodes, objective, liveFindings, sim.claims, sim.consensusMap, sim.gateDecision, sim.audit, hasRun]
  );
  const exportState = useMemo(
    () => buildExportState({ project: { name: projectName }, objective, nodes, findings: liveFindings, sim, scorecard }),
    [projectName, objective, nodes, liveFindings, sim, scorecard]
  );
  const markdown = useMemo(() => toMarkdownReport(exportState), [exportState]);

  const badgeKey = sim.stageIndex === -1 ? 'idle' : sim.status;
  let badgeLabel = RUN_STATUS_LABEL[badgeKey] || badgeKey;
  let badgeTone = RUN_BADGE_TONE[badgeKey] || 'neutral';
  if (badgeKey === 'completed') {
    badgeLabel = scorecard.finalStatus;
    badgeTone = scorecard.finalStatus === 'Blocked' ? 'bad' : scorecard.finalStatus === 'Needs Revision' ? 'warn' : scorecard.finalStatus === 'Ready' ? 'ok' : 'neutral';
  }

  /* ---- objective / workflow generation ---- */
  function handleGenerate() {
    const { nodes: newNodes, matchedDomains } = generateWorkflowFromObjective(objective);
    setNodes(newNodes);
    setLastMatchedDomains(matchedDomains);
    setSim(initialSimState);
    setFindings([]); setHasAnalyzed(false);
    setSelectedNodeId(null);
    pushToast('ok', 'Workflow generated (' + newNodes.length + ' stages, ' + (matchedDomains.length ? matchedDomains.join(', ') : 'general') + ').');
  }

  function handleAnalyze() {
    const f = analyzeArchitecture({ nodes, objective, claims: sim.claims, consensusMap: sim.consensusMap });
    setFindings(f); setHasAnalyzed(true);
    const criticalN = f.filter((x) => x.severity === 'critical').length;
    pushToast(criticalN > 0 ? 'bad' : 'ok', 'Analysis complete: ' + f.length + ' finding(s), ' + criticalN + ' critical.');
  }

  function handleApplyFixes() {
    const { nodes: fixedNodes, fixedCount } = applySafeFixes(nodes, findings, objective);
    setNodes(fixedNodes);
    const refreshed = analyzeArchitecture({ nodes: fixedNodes, objective, claims: sim.claims, consensusMap: sim.consensusMap });
    setFindings(refreshed);
    pushToast('ok', 'Applied ' + fixedCount + ' safe fix(es).');
  }

  function doResetDesign(alsoRenameProject) {
    setObjective(BLANK_OBJECTIVE);
    setNodes(makeCoreNodes());
    setLastMatchedDomains([]);
    setFindings([]); setHasAnalyzed(false);
    setSim(initialSimState);
    setSelectedNodeId(null);
    if (alsoRenameProject) { setProjectName('Untitled PINCH Workflow'); setActiveTab('design'); }
    pushToast('info', alsoRenameProject ? 'Started a new workflow.' : 'Objective and workflow reset.');
  }

  function handleResetClick() {
    setConfirmState({
      title: 'Reset this workflow?', danger: true, confirmLabel: 'Reset',
      message: 'This clears the objective, custom agents, and any simulation results. This cannot be undone.',
      onConfirm: () => doResetDesign(false),
    });
  }
  function handleNewWorkflowClick() {
    setConfirmState({
      title: 'Start a new workflow?', danger: true, confirmLabel: 'Start new',
      message: 'This discards the current project, objective, and simulation results. This cannot be undone.',
      onConfirm: () => doResetDesign(true),
    });
  }

  function handleLoadExample(ex) {
    const { nodes: newNodes, matchedDomains } = generateWorkflowFromObjective(ex.objective);
    let finalNodes = newNodes;
    if (ex.unknownTool) {
      finalNodes = finalNodes.map((n) => n.id === 'executor' ? { ...n, allowedTools: Array.from(new Set([...(n.allowedTools || []), ex.unknownTool])) } : n);
    }
    setObjective({ ...ex.objective });
    setNodes(finalNodes);
    setLastMatchedDomains(matchedDomains);
    setSim(initialSimState);
    setFindings([]); setHasAnalyzed(false);
    setSelectedNodeId(null);
    setShowExamplePicker(false);
    setActiveTab('design');
    pushToast('ok', 'Loaded example: ' + ex.label + '.');
  }

  function handleSave() {
    savedSnapshotRef.current = { projectName, objective, nodes, sim, savedAt: nowIso() };
    pushToast('ok', 'Workflow saved for this session.');
  }

  /* ---- node editing ---- */
  function updateNode(id, patch) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }
  function toggleNodeEnabled(id) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)));
  }
  function deleteNodeConfirmed(id) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    pushToast('info', 'Agent deleted.');
  }
  function handleDeleteNode(id) {
    const node = nodes.find((n) => n.id === id);
    if (!node || node.core) return;
    setConfirmState({
      title: 'Delete this agent?', danger: true, confirmLabel: 'Delete',
      message: 'Delete "' + node.name + '" from the workflow. This cannot be undone.',
      onConfirm: () => deleteNodeConfirmed(id),
    });
  }
  function duplicateNode(id) {
    setNodes((prev) => {
      const idx = prev.findIndex((n) => n.id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: uid('custom'), name: prev[idx].name + ' Copy', locked: false, core: false, custom: true };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    pushToast('ok', 'Agent duplicated.');
  }
  function moveNode(id, dir) {
    setNodes((prev) => {
      const idx = prev.findIndex((n) => n.id === id);
      const gateIdx = prev.findIndex((n) => n.id === 'permission_gate');
      const upperBound = gateIdx === -1 ? prev.length - 1 : gateIdx - 1;
      const target = idx + dir;
      if (idx === -1 || !prev[idx].custom) return prev;
      if (target < 1 || target > upperBound) { pushToast('warn', "Can't move past the Permission Gate or before the Intent Router."); return prev; }
      const next = [...prev];
      const tmp = next[idx]; next[idx] = next[target]; next[target] = tmp;
      return next;
    });
  }
  function addCustomNode({ name, category, responsibility, afterId }) {
    const newNode = {
      id: uid('custom'), name: name || 'New Agent', category, icon: undefined,
      responsibility: responsibility || '', instructions: '', expectedInput: '', expectedOutput: '',
      allowedTools: [], riskLevel: 'low', retryLimit: 1, failureBehavior: 'halt',
      core: false, locked: false, enabled: true, custom: true,
    };
    setNodes((prev) => {
      const idx = prev.findIndex((n) => n.id === afterId);
      const next = [...prev];
      next.splice(idx === -1 ? prev.length : idx + 1, 0, newNode);
      return next;
    });
    setSelectedNodeId(newNode.id);
    setShowAddAgent(false);
    setInspectorOpen(true);
    pushToast('ok', newNode.name + ' added.');
  }

  /* ---- simulation ---- */
  function getSnapshot() {
    return { snapshotNodes: nodes, snapshotObjective: { ...objective }, exampleDef: EXAMPLES.find((ex) => ex.objective.text === objective.text) || null, matchedDomains: lastMatchedDomains };
  }
  function handleRun() {
    setSim((prev) => {
      let base = prev;
      const activeCount = nodes.filter((n) => n.enabled).length;
      const finished = prev.stageIndex + 1 >= activeCount;
      if (prev.stageIndex === -1 || finished) base = { ...initialSimState, ...getSnapshot() };
      return { ...base, status: 'running' };
    });
  }
  function handleStep() {
    setSim((prev) => {
      let base = prev.stageIndex === -1 ? { ...initialSimState, ...getSnapshot() } : prev;
      const advanced = advanceSimulation(base, base.snapshotNodes, base.snapshotObjective, base.exampleDef, base.matchedDomains);
      return { ...advanced, status: advanced.status === 'awaiting_approval' ? 'awaiting_approval' : (advanced.status === 'completed' ? 'completed' : 'paused') };
    });
  }
  function handlePause() { setSim((prev) => (prev.status === 'running' ? { ...prev, status: 'paused' } : prev)); }
  function handleContinue() { setSim((prev) => ({ ...prev, status: 'running' })); }
  function handleCancel() {
    setSim((prev) => {
      const active = prev.snapshotNodes ? prev.snapshotNodes.filter((n) => n.enabled) : [];
      const stageStates = { ...prev.stageStates };
      active.forEach((n, i) => { if (i > prev.stageIndex) stageStates[n.id] = 'skipped'; });
      return { ...prev, status: 'idle', stageStates, approval: null };
    });
    pushToast('info', 'Simulation cancelled.');
  }
  function handleResetRunClick() {
    setConfirmState({
      title: 'Reset this run?', danger: true, confirmLabel: 'Reset run',
      message: 'This clears simulation progress, claims, and verification results. The workflow design is kept.',
      onConfirm: () => { setSim(initialSimState); pushToast('info', 'Run reset.'); },
    });
  }
  function resolveApproval(choice) {
    setSim((prev) => {
      if (!prev.approval) return prev;
      const events = [...prev.events];
      const stageStates = { ...prev.stageStates };
      const gateId = prev.approval.nodeId || 'permission_gate';
      let gateDecision = prev.gateDecision ? { ...prev.gateDecision } : { decision: 'BLOCK', reason: '', disallowed: [] };
      let approvedOnce = prev.approvedOnce;
      if (choice === 'approve') {
        stageStates[gateId] = 'passed'; gateDecision.decision = 'EXECUTE'; gateDecision.reason = 'Approved once by user override.';
        approvedOnce = true; events.push(mkEvent(gateId, 'approval', 'User approved this one-time execution.'));
      } else if (choice === 'reject') {
        stageStates[gateId] = 'blocked'; gateDecision.decision = 'BLOCK'; gateDecision.reason = 'Rejected by user; execution will not proceed.';
        events.push(mkEvent(gateId, 'critical', 'User rejected the request. Execution blocked.'));
      } else {
        stageStates[gateId] = 'revised'; gateDecision.decision = 'REVISE'; gateDecision.reason = 'User requested revision before this can proceed.';
        events.push(mkEvent(gateId, 'warning', 'User requested revision. Return to Design to adjust the workflow.'));
      }
      return { ...prev, stageStates, gateDecision, approvedOnce, approval: null, status: 'paused', events };
    });
  }

  /* ---- export actions ---- */
  async function handleCopyJson() { const ok = await copyToClipboard(JSON.stringify(exportState, null, 2)); pushToast(ok ? 'ok' : 'bad', ok ? 'JSON copied to clipboard.' : 'Copy failed \u2014 try downloading instead.'); }
  function handleDownloadJson() { downloadTextFile(projectName.replace(/\s+/g, '_') + '.json', JSON.stringify(exportState, null, 2), 'application/json'); pushToast('ok', 'JSON downloaded.'); }
  async function handleCopyMd() { const ok = await copyToClipboard(markdown); pushToast(ok ? 'ok' : 'bad', ok ? 'Markdown copied to clipboard.' : 'Copy failed \u2014 try downloading instead.'); }
  function handleDownloadMd() { downloadTextFile(projectName.replace(/\s+/g, '_') + '_report.md', markdown, 'text/markdown'); pushToast('ok', 'Markdown downloaded.'); }
  function handleExportClick() { setActiveTab('export'); }

  function selectNode(id) { setSelectedNodeId(id); setInspectorOpen(true); }

  useEffect(() => {
    if (sim.status !== 'running') return undefined;
    const t = setTimeout(() => {
      setSim((prev) => advanceSimulation(prev, prev.snapshotNodes, prev.snapshotObjective, prev.exampleDef, prev.matchedDomains));
    }, 900);
    return () => clearTimeout(t);
  }, [sim.status, sim.stageIndex]);

  const tabs = [
    { id: 'design', label: 'Design' },
    { id: 'simulate', label: 'Simulate' },
    { id: 'verify', label: 'Verify' },
    { id: 'export', label: 'Export' },
  ];

  return (
    <div className={clsx('pws-root', 'theme-' + theme)}>
      <style>{CSS_TEXT}</style>
      <TopBar
        projectName={projectName}
        onRenameProject={setProjectName}
        badgeStatus={badgeTone}
        badgeLabel={badgeLabel}
        onNew={handleNewWorkflowClick}
        onLoadExample={() => setShowExamplePicker(true)}
        onSave={handleSave}
        onExport={handleExportClick}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onAbout={() => setShowAbout(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((s) => !s)}
        hasInspectorTarget={!!selectedNode}
      />
      <div className="pws-body">
        {sidebarOpen && <div className="drawer-backdrop only-narrow" onClick={() => setSidebarOpen(false)} />}
        <Sidebar
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          stageStates={sim.stageStates}
          findingsByNode={findingsByNode}
          open={sidebarOpen}
          onSelect={(id) => { selectNode(id); setSidebarOpen(false); }}
          onToggleEnabled={toggleNodeEnabled}
          onDuplicate={duplicateNode}
          onDelete={handleDeleteNode}
          onMove={moveNode}
          onAddClick={() => setShowAddAgent((s) => !s)}
          showAddForm={showAddAgent}
          onAddAgent={addCustomNode}
          onCancelAdd={() => setShowAddAgent(false)}
        />
        <main className="pws-main">
          <SegmentedTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <div className="pws-tabpanel" role="tabpanel">
            {activeTab === 'design' && (
              <DesignTab
                objective={objective} onObjectiveChange={setObjective}
                nodes={nodes} stageStates={sim.stageStates} selectedNodeId={selectedNodeId} onSelectNode={selectNode}
                onGenerate={handleGenerate} onAnalyze={handleAnalyze} onApplyFixes={handleApplyFixes} onResetClick={handleResetClick}
                findings={findings} hasAnalyzed={hasAnalyzed} fixableCount={fixableCount}
              />
            )}
            {activeTab === 'simulate' && (
              <SimulateTab
                nodes={nodes} sim={sim} onRun={handleRun} onPause={handlePause} onContinue={handleContinue} onStep={handleStep}
                onCancel={handleCancel} onResetClick={handleResetRunClick}
                onApprove={() => resolveApproval('approve')} onReject={() => resolveApproval('reject')} onRevise={() => resolveApproval('revise')}
                selectedStageId={selectedNodeId} onSelectStage={selectNode}
              />
            )}
            {activeTab === 'verify' && (
              <VerifyTab claims={sim.claims} verifierResults={sim.verifierResults} consensusMap={sim.consensusMap} audit={sim.audit} scorecard={scorecard} />
            )}
            {activeTab === 'export' && (
              <ExportTab exportState={exportState} markdown={markdown} onCopyJson={handleCopyJson} onDownloadJson={handleDownloadJson} onCopyMd={handleCopyMd} onDownloadMd={handleDownloadMd} />
            )}
          </div>
        </main>
        {inspectorOpen && <div className="drawer-backdrop only-narrow" onClick={() => setInspectorOpen(false)} />}
        <Inspector node={selectedNode} open={inspectorOpen} onChange={updateNode} onClose={() => setInspectorOpen(false)} />
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {confirmState && (
        <ConfirmDialog
          title={confirmState.title} message={confirmState.message} confirmLabel={confirmState.confirmLabel} danger={confirmState.danger}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)}
        />
      )}
      {showExamplePicker && <ExamplePicker onPick={handleLoadExample} onClose={() => setShowExamplePicker(false)} />}
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
    </div>
  );
}

/* ============================== styles ============================== */

const CSS_TEXT = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.pws-root.theme-dark {
  --bg-canvas:#0A0D14; --bg-panel:#12151F; --bg-panel-raised:#191D2A; --bg-inset:#0D0F17;
  --border:#262B3B; --border-soft:#1C202C;
  --text-1:#E8EAF2; --text-2:#9BA1B5; --text-3:#6B7086;
  --accent:#8C7BF6; --accent-2:#B3A6FF; --accent-soft:rgba(140,123,246,0.16); --accent-contrast:#0A0D14;
  --ok:#35D28E; --ok-soft:rgba(53,210,142,0.14);
  --warn:#F0B43E; --warn-soft:rgba(240,180,62,0.16);
  --bad:#F2685E; --bad-soft:rgba(242,104,94,0.16);
  --shadow:0 12px 36px rgba(0,0,0,0.4);
  --cat-router:#5B8DEF; --cat-planner:#7C6CF6; --cat-generator:#B36CF6; --cat-verifier:#2FB6C4;
  --cat-consensus:#3FBF9F; --cat-permission:#E0A339; --cat-executor:#F0824A; --cat-auditor:#9099B0;
}
.pws-root.theme-light {
  --bg-canvas:#EEF0F6; --bg-panel:#FFFFFF; --bg-panel-raised:#F7F8FC; --bg-inset:#EBEDF4;
  --border:#DDE1EB; --border-soft:#E9EBF2;
  --text-1:#14151F; --text-2:#54596B; --text-3:#868CA0;
  --accent:#6C56E8; --accent-2:#513FCB; --accent-soft:rgba(108,86,232,0.10); --accent-contrast:#FFFFFF;
  --ok:#17915A; --ok-soft:rgba(23,145,90,0.10);
  --warn:#A36A0A; --warn-soft:rgba(163,106,10,0.10);
  --bad:#C43D34; --bad-soft:rgba(196,61,52,0.10);
  --shadow:0 12px 36px rgba(20,20,45,0.12);
  --cat-router:#3568D4; --cat-planner:#5B47D6; --cat-generator:#8B3FD6; --cat-verifier:#0E8CA6;
  --cat-consensus:#178F73; --cat-permission:#966011; --cat-executor:#C05A24; --cat-auditor:#5B6072;
}
.pws-root {
  --radius-s:6px; --radius-m:10px; --radius-l:16px;
  --font-ui:'IBM Plex Sans',-apple-system,BlinkMacSystemFont,sans-serif;
  --font-mono:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;
  background:var(--bg-canvas); color:var(--text-1); font-family:var(--font-ui);
  min-height:100vh; display:flex; flex-direction:column; font-size:14px; line-height:1.5;
}
.pws-root * { box-sizing:border-box; }
.pws-root button, .pws-root input, .pws-root select, .pws-root textarea { font-family:inherit; font-size:inherit; color:inherit; }
.pws-root :focus-visible { outline:2px solid var(--accent); outline-offset:2px; border-radius:4px; }
.pws-root h2, .pws-root h3 { margin:0; font-weight:600; }
.pws-root p { margin:0; }
.pws-root ul, .pws-root ol, .pws-root dl { margin:0; padding:0; list-style:none; }
.pws-root dt { font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-3); margin-top:10px; }
.pws-root dt:first-child { margin-top:0; }
.pws-root dd { margin:2px 0 0; color:var(--text-1); font-size:13px; }
.mono { font-family:var(--font-mono); font-size:12px; }
.muted-note { color:var(--text-3); font-size:13px; padding:10px 0; }

.spin { animation:pws-spin 1s linear infinite; }
@keyframes pws-spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion:reduce) { .pws-root * { animation-duration:0.01ms !important; transition-duration:0.01ms !important; } }

/* topbar */
.topbar { height:56px; flex-shrink:0; display:flex; align-items:center; gap:12px; padding:0 16px; border-bottom:1px solid var(--border); background:var(--bg-panel); position:sticky; top:0; z-index:30; }
.topbar-brand { display:flex; align-items:center; gap:8px; color:var(--accent-2); flex-shrink:0; }
.brand-name { font-weight:600; font-size:14px; color:var(--text-1); white-space:nowrap; }
.topbar-project { flex:0 1 240px; min-width:80px; }
.project-name-input { width:100%; background:var(--bg-inset); border:1px solid var(--border); border-radius:var(--radius-s); padding:6px 10px; color:var(--text-2); font-size:13px; }
.project-name-input:hover, .project-name-input:focus { color:var(--text-1); border-color:var(--accent); }
.sim-badge { font-family:var(--font-mono); font-size:11px; padding:4px 10px; border-radius:999px; border:1px solid var(--border); white-space:nowrap; }
.sim-badge.tone-neutral { color:var(--text-2); }
.sim-badge.tone-accent { color:var(--accent-2); border-color:var(--accent); background:var(--accent-soft); }
.sim-badge.tone-warn { color:var(--warn); border-color:var(--warn); background:var(--warn-soft); }
.sim-badge.tone-bad { color:var(--bad); border-color:var(--bad); background:var(--bad-soft); }
.sim-badge.tone-ok { color:var(--ok); border-color:var(--ok); background:var(--ok-soft); }
.topbar-actions { display:flex; align-items:center; gap:6px; margin-left:auto; flex-shrink:0; }

/* buttons */
.btn { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:var(--radius-s); border:1px solid var(--border); background:var(--bg-panel-raised); color:var(--text-1); cursor:pointer; white-space:nowrap; font-weight:500; }
.btn:hover:not(:disabled) { border-color:var(--accent); color:var(--accent-2); }
.btn:disabled { opacity:0.42; cursor:not-allowed; }
.btn-primary { background:var(--accent); border-color:var(--accent); color:var(--accent-contrast); }
.btn-primary:hover:not(:disabled) { background:var(--accent-2); border-color:var(--accent-2); color:var(--accent-contrast); }
.btn-ghost { background:transparent; }
.btn-danger { background:transparent; border-color:var(--bad); color:var(--bad); }
.btn-danger:hover:not(:disabled) { background:var(--bad-soft); color:var(--bad); }
.btn-sm { padding:5px 9px; font-size:12px; }
.icon-btn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:var(--radius-s); border:1px solid transparent; background:transparent; color:var(--text-2); cursor:pointer; flex-shrink:0; }
.icon-btn:hover:not(:disabled) { background:var(--bg-panel-raised); color:var(--text-1); border-color:var(--border); }
.icon-btn:disabled { opacity:0.35; cursor:not-allowed; }
.icon-btn.v-danger:hover:not(:disabled) { color:var(--bad); border-color:var(--bad); }
.icon-btn.is-active { color:var(--accent-2); background:var(--accent-soft); }
.only-narrow { display:none; }

/* body layout */
.pws-body { flex:1; display:flex; min-height:0; }
.sidebar { width:308px; flex-shrink:0; border-right:1px solid var(--border); background:var(--bg-panel); overflow-y:auto; padding:14px; }
.sidebar-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.sidebar-head h2 { font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-3); }
.node-list { display:flex; flex-direction:column; gap:8px; }
.pws-main { flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; }
.tabbar { display:flex; gap:2px; padding:10px 24px 0; border-bottom:1px solid var(--border); background:var(--bg-panel); flex-shrink:0; }
.tab-btn { padding:9px 16px; border:none; background:transparent; color:var(--text-2); border-bottom:2px solid transparent; cursor:pointer; font-weight:500; margin-bottom:-1px; }
.tab-btn:hover { color:var(--text-1); }
.tab-btn.is-active { color:var(--accent-2); border-bottom-color:var(--accent); }
.pws-tabpanel { flex:1; overflow-y:auto; padding:22px 24px 60px; }
.inspector { width:320px; flex-shrink:0; border-left:1px solid var(--border); background:var(--bg-panel); overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }
.inspector-head { display:flex; align-items:center; justify-content:space-between; }

/* forms */
.form-row { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
.form-row-inline { flex-direction:row; align-items:center; justify-content:space-between; }
.field-label { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:500; color:var(--text-2); }
.form-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.form-row input[type="text"], .form-row input:not([type]), .form-row input[type="number"], .form-row select, .form-row textarea, .add-agent-form input, .add-agent-form select, .add-agent-form textarea {
  width:100%; background:var(--bg-inset); border:1px solid var(--border); border-radius:var(--radius-s); padding:8px 10px; color:var(--text-1); resize:vertical;
}
.form-row input:focus, .form-row select:focus, .form-row textarea:focus { border-color:var(--accent); }
.form-hint { font-size:11.5px; color:var(--text-3); display:flex; align-items:center; gap:5px; margin-top:2px; }
.panel { background:var(--bg-panel); border:1px solid var(--border); border-radius:var(--radius-l); padding:18px; margin-bottom:18px; }
.panel-title { display:flex; align-items:center; gap:8px; font-size:14px; margin-bottom:14px; color:var(--text-1); }
.panel-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }

/* category chips / node cards */
.cat-chip { display:inline-flex; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:600; width:fit-content; }
.cat-router{ color:var(--cat-router); background:color-mix(in srgb, var(--cat-router) 16%, transparent); }
.cat-planner{ color:var(--cat-planner); background:color-mix(in srgb, var(--cat-planner) 16%, transparent); }
.cat-generator{ color:var(--cat-generator); background:color-mix(in srgb, var(--cat-generator) 16%, transparent); }
.cat-verifier{ color:var(--cat-verifier); background:color-mix(in srgb, var(--cat-verifier) 16%, transparent); }
.cat-consensus{ color:var(--cat-consensus); background:color-mix(in srgb, var(--cat-consensus) 16%, transparent); }
.cat-permission{ color:var(--cat-permission); background:color-mix(in srgb, var(--cat-permission) 16%, transparent); }
.cat-executor{ color:var(--cat-executor); background:color-mix(in srgb, var(--cat-executor) 16%, transparent); }
.cat-auditor{ color:var(--cat-auditor); background:color-mix(in srgb, var(--cat-auditor) 16%, transparent); }

.node-card { border:1px solid var(--border); border-left:3px solid var(--border); border-radius:var(--radius-m); background:var(--bg-panel-raised); overflow:hidden; }
.node-card.cat-router{ border-left-color:var(--cat-router); }
.node-card.cat-planner{ border-left-color:var(--cat-planner); }
.node-card.cat-generator{ border-left-color:var(--cat-generator); }
.node-card.cat-verifier{ border-left-color:var(--cat-verifier); }
.node-card.cat-consensus{ border-left-color:var(--cat-consensus); }
.node-card.cat-permission{ border-left-color:var(--cat-permission); }
.node-card.cat-executor{ border-left-color:var(--cat-executor); }
.node-card.cat-auditor{ border-left-color:var(--cat-auditor); }
.node-card.is-selected { box-shadow:0 0 0 2px var(--accent) inset; }
.node-card.is-disabled { opacity:0.5; }
.node-card-main { width:100%; display:flex; align-items:flex-start; gap:9px; padding:10px 10px 6px; background:transparent; border:none; text-align:left; cursor:pointer; }
.node-icon { color:var(--text-2); margin-top:1px; flex-shrink:0; }
.node-meta { display:flex; flex-direction:column; gap:2px; min-width:0; }
.node-name { font-weight:600; font-size:13px; display:flex; align-items:center; gap:5px; }
.lock-ico { color:var(--text-3); }
.node-cat { font-size:11.5px; color:var(--text-3); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.node-card-side { display:flex; align-items:center; gap:8px; padding:0 10px 8px; }
.warn-count { display:inline-flex; align-items:center; gap:3px; font-size:11px; color:var(--warn); }
.node-card-tools { display:flex; align-items:center; gap:2px; padding:6px 8px; border-top:1px solid var(--border-soft); }

/* status pills */
.status-pill { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; padding:3px 8px; border-radius:999px; white-space:nowrap; }
.status-pill.is-small { font-size:10px; padding:2px 7px; }
.st-idle { color:var(--text-3); background:var(--bg-inset); }
.st-queued { color:var(--text-2); background:var(--bg-inset); }
.st-running { color:var(--accent-2); background:var(--accent-soft); }
.st-passed { color:var(--ok); background:var(--ok-soft); }
.st-failed { color:var(--bad); background:var(--bad-soft); }
.st-blocked { color:var(--bad); background:var(--bad-soft); }
.st-waiting { color:var(--warn); background:var(--warn-soft); }
.st-revised { color:var(--warn); background:var(--warn-soft); }
.st-skipped { color:var(--text-3); background:var(--bg-inset); }

/* toggle */
.toggle { width:34px; height:19px; border-radius:999px; background:var(--bg-inset); border:1px solid var(--border); position:relative; cursor:pointer; flex-shrink:0; }
.toggle.is-on { background:var(--accent); border-color:var(--accent); }
.toggle-knob { position:absolute; top:2px; left:2px; width:13px; height:13px; border-radius:50%; background:var(--text-1); transition:transform .15s ease; }
.toggle.is-on .toggle-knob { transform:translateX(15px); background:var(--accent-contrast); }

/* infotip */
.infotip { position:relative; display:inline-flex; }
.infotip-btn { display:inline-flex; color:var(--text-3); background:none; border:none; cursor:pointer; padding:1px; }
.infotip-btn:hover { color:var(--accent-2); }
.infotip-panel { position:absolute; z-index:50; top:18px; left:0; width:230px; background:var(--bg-panel-raised); border:1px solid var(--border); border-radius:var(--radius-s); padding:9px 10px; font-size:12px; color:var(--text-2); box-shadow:var(--shadow); font-weight:400; }

/* pipeline flow */
.pipeline-flow { display:flex; align-items:center; flex-wrap:wrap; gap:4px; }
.flow-card { display:flex; align-items:center; gap:7px; padding:8px 12px; border-radius:var(--radius-m); border:1px solid var(--border); background:var(--bg-panel-raised); cursor:pointer; }
.flow-card.is-disabled { opacity:0.4; }
.flow-card.is-selected { border-color:var(--accent); }
.flow-card.is-current { box-shadow:0 0 0 2px var(--accent-soft), 0 0 14px var(--accent-soft); border-color:var(--accent); }
.flow-card-icon { color:var(--text-2); }
.flow-card-name { font-size:12.5px; font-weight:500; white-space:nowrap; }
.flow-arrow { color:var(--text-3); flex-shrink:0; }

/* chips / filters */
.chip-filters { display:flex; gap:6px; flex-wrap:wrap; }
.chip { padding:5px 11px; border-radius:999px; border:1px solid var(--border); background:transparent; color:var(--text-2); cursor:pointer; font-size:12px; }
.chip.is-active { background:var(--accent-soft); color:var(--accent-2); border-color:var(--accent); }

/* findings */
.findings-toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.findings-list { display:flex; flex-direction:column; gap:8px; }
.finding-row { display:flex; gap:10px; padding:10px 12px; border-radius:var(--radius-m); border:1px solid var(--border); background:var(--bg-panel-raised); }
.finding-row.sev-critical { border-left:3px solid var(--bad); }
.finding-row.sev-critical svg { color:var(--bad); }
.finding-row.sev-warning { border-left:3px solid var(--warn); }
.finding-row.sev-warning svg { color:var(--warn); }
.finding-row.sev-info { border-left:3px solid var(--text-3); }
.finding-row.sev-info svg { color:var(--text-3); }
.finding-explain { font-size:13px; font-weight:500; }
.finding-rec { font-size:12px; color:var(--text-3); margin-top:2px; }

/* badges */
.badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; background:var(--bg-inset); color:var(--text-2); }
.badge.tone-bad { background:var(--bad-soft); color:var(--bad); }
.badge.tone-warn { background:var(--warn-soft); color:var(--warn); }
.badge.tone-ok { background:var(--ok-soft); color:var(--ok); }
.badge.tone-neutral { background:var(--bg-inset); color:var(--text-2); }

/* sim controls */
.sim-controls { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
.progress-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
.progress-track { flex:1; height:6px; border-radius:999px; background:var(--bg-inset); overflow:hidden; }
.progress-fill { height:100%; background:var(--accent); transition:width .3s ease; }
.progress-label { font-size:11.5px; color:var(--text-3); font-family:var(--font-mono); white-space:nowrap; }
.sim-current-label { font-size:13px; margin-bottom:14px; color:var(--text-2); }
.sim-status-word.tone-running { color:var(--accent-2); }
.sim-status-word.tone-paused, .sim-status-word.tone-awaiting_approval { color:var(--warn); }
.sim-status-word.tone-completed { color:var(--ok); }
.sim-status-word.tone-idle { color:var(--text-3); }

/* approval */
.approval-panel { border:1px solid var(--warn); background:var(--warn-soft); border-radius:var(--radius-l); padding:16px; margin-bottom:18px; }
.approval-head { display:flex; align-items:center; gap:8px; color:var(--warn); margin-bottom:10px; }
.approval-grid { display:grid; grid-template-columns:auto 1fr; column-gap:14px; row-gap:2px; align-items:start; }
.approval-grid dt { grid-column:1; white-space:nowrap; }
.approval-grid dd { grid-column:2; }
.approval-actions { display:flex; gap:8px; margin-top:14px; flex-wrap:wrap; }

/* timeline */
.event-timeline { display:flex; flex-direction:column; gap:6px; max-height:420px; overflow-y:auto; }
.event-row { display:flex; align-items:baseline; gap:8px; padding:7px 9px; border-radius:var(--radius-s); background:var(--bg-panel-raised); border-left:3px solid var(--border); font-size:12.5px; }
.event-row.ev-critical { border-left-color:var(--bad); }
.event-row.ev-warning { border-left-color:var(--warn); }
.event-row.ev-approval { border-left-color:var(--warn); }
.event-row.ev-info { border-left-color:var(--cat-verifier); }
.event-node-btn { background:none; border:none; color:var(--accent-2); cursor:pointer; font-weight:600; padding:0; flex-shrink:0; }
.event-msg { color:var(--text-2); flex:1; }
.event-time { color:var(--text-3); font-family:var(--font-mono); font-size:10.5px; white-space:nowrap; }
.stage-detail-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:18px; }

/* claims */
.claim-list { display:flex; flex-direction:column; gap:6px; margin-top:10px; }
.claim-row { border:1px solid var(--border); border-radius:var(--radius-m); background:var(--bg-panel-raised); overflow:hidden; }
.claim-row-head { width:100%; display:flex; align-items:center; gap:8px; padding:9px 10px; background:none; border:none; cursor:pointer; text-align:left; color:var(--text-1); }
.chev { transition:transform .15s ease; color:var(--text-3); flex-shrink:0; }
.chev.is-rot { transform:rotate(90deg); }
.claim-id { color:var(--text-3); flex-shrink:0; }
.claim-text { flex:1; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.claim-row-body { padding:4px 14px 14px 34px; border-top:1px solid var(--border-soft); }
.verifier-col-title { display:flex; align-items:center; gap:7px; font-size:13px; margin-bottom:10px; }
.verifier-list { display:flex; flex-direction:column; gap:8px; }
.verifier-item { padding:10px; border-radius:var(--radius-m); border:1px solid var(--border); background:var(--bg-panel-raised); }
.verifier-item-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
.verifier-rationale { font-size:12.5px; color:var(--text-2); }
.verifier-sub { font-size:11px; color:var(--text-3); margin-top:3px; }

/* audit */
.audit-panel { border:1px solid var(--border); border-radius:var(--radius-m); padding:14px; background:var(--bg-panel-raised); }
.audit-panel.has-mismatch { border-color:var(--bad); }
.audit-flag { display:flex; align-items:center; gap:8px; color:var(--bad); font-weight:600; margin-bottom:10px; font-size:13px; }

/* scorecard */
.scorecard-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:12px; }
.final-status { padding:6px 14px; border-radius:999px; font-weight:700; font-size:13px; }
.final-status.tone-ready { background:var(--ok-soft); color:var(--ok); }
.final-status.tone-needs-revision { background:var(--warn-soft); color:var(--warn); }
.final-status.tone-blocked { background:var(--bad-soft); color:var(--bad); }
.final-status.tone-incomplete { background:var(--bg-inset); color:var(--text-3); }
.overall-ring { text-align:right; }
.overall-num { display:block; font-size:26px; font-weight:700; font-family:var(--font-mono); color:var(--accent-2); }
.overall-label { font-size:10.5px; color:var(--text-3); text-transform:uppercase; letter-spacing:.05em; }
.metric-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
.metric-cell { font-size:12px; }
.metric-top { display:flex; justify-content:space-between; margin-bottom:4px; color:var(--text-2); }
.metric-track { height:5px; border-radius:999px; background:var(--bg-inset); overflow:hidden; }
.metric-fill { height:100%; background:var(--accent); }

/* export */
.code-preview { background:var(--bg-inset); border:1px solid var(--border); border-radius:var(--radius-m); padding:14px; font-family:var(--font-mono); font-size:12px; line-height:1.6; overflow:auto; max-height:480px; white-space:pre; color:var(--text-2); margin-top:10px; }

/* modal / toast */
.modal-backdrop { position:fixed; inset:0; background:rgba(4,6,12,0.55); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; }
.modal { width:100%; max-width:440px; max-height:86vh; overflow-y:auto; background:var(--bg-panel); border:1px solid var(--border); border-radius:var(--radius-l); box-shadow:var(--shadow); padding:20px; }
.modal.is-wide { max-width:660px; }
.modal-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:16px; }
.confirm-msg { color:var(--text-2); font-size:13.5px; line-height:1.6; }
.about-list { display:flex; flex-direction:column; gap:10px; font-size:13px; color:var(--text-2); line-height:1.6; }
.about-list li { padding-left:14px; position:relative; }
.about-list li::before { content:'\\2013'; position:absolute; left:0; color:var(--text-3); }
.example-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.example-card { text-align:left; padding:14px; border-radius:var(--radius-m); border:1px solid var(--border); background:var(--bg-panel-raised); cursor:pointer; display:flex; flex-direction:column; gap:6px; }
.example-card:hover { border-color:var(--accent); }
.example-card.is-adversarial { border-color:var(--bad); }
.example-card.is-adversarial:hover { border-color:var(--bad); background:var(--bad-soft); }
.example-card p { font-size:12px; color:var(--text-3); }
.add-agent-form { border:1px dashed var(--border); border-radius:var(--radius-m); padding:12px; margin-bottom:12px; background:var(--bg-inset); }

.toast-stack { position:fixed; bottom:18px; right:18px; display:flex; flex-direction:column; gap:8px; z-index:200; max-width:340px; }
.toast { display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:var(--radius-m); background:var(--bg-panel-raised); border:1px solid var(--border); box-shadow:var(--shadow); font-size:12.5px; }
.toast.tone-ok { border-color:var(--ok); } .toast.tone-ok svg { color:var(--ok); }
.toast.tone-warn { border-color:var(--warn); } .toast.tone-warn svg { color:var(--warn); }
.toast.tone-bad { border-color:var(--bad); } .toast.tone-bad svg { color:var(--bad); }
.toast.tone-info svg { color:var(--accent-2); }
.toast span { flex:1; }
.toast-x { background:none; border:none; color:var(--text-3); cursor:pointer; padding:0; display:flex; }

.empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:6px; padding:34px 16px; color:var(--text-3); }
.empty-state h3 { color:var(--text-2); font-size:13.5px; }
.empty-state p { font-size:12.5px; max-width:280px; }

.drawer-backdrop { display:none; }

/* responsive */
@media (max-width: 980px) {
  .only-narrow { display:inline-flex; }
  .sidebar, .inspector { position:fixed; top:56px; bottom:0; width:86vw; max-width:340px; z-index:60; transform:translateX(-105%); transition:transform .2s ease; box-shadow:var(--shadow); }
  .sidebar { left:0; }
  .inspector { right:0; transform:translateX(105%); }
  .sidebar.is-open, .inspector.is-open { transform:translateX(0); }
  .drawer-backdrop { display:block; position:fixed; inset:56px 0 0 0; background:rgba(4,6,12,0.5); z-index:55; }
  .two-col, .form-grid-2, .example-grid, .metric-grid { grid-template-columns:1fr; }
  .topbar-project { flex:1; }
  .brand-name { display:none; }
  .topbar-actions .btn span { display:none; }
}
@media (max-width: 640px) {
  .topbar-actions .btn:not(.btn-primary) { display:none; }
  .pws-tabpanel { padding:16px; }
}
`;
