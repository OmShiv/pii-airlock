// The PII airlock: find personal data on the device, swap it for placeholders
// before a prompt leaves, and swap it back into the model's reply locally.

// ---- Structured detectors: patterns plus validators -------------------------------

const luhn = (digits) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return sum % 10 === 0;
};

const ibanOk = (raw) => {
  const s = raw.replace(/\s/g, '');
  const moved = s.slice(4) + s.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const v = /[A-Z]/.test(ch) ? ch.charCodeAt(0) - 55 : Number(ch);
    rest = Number(`${rest}${v}`) % 97;
  }
  return rest === 1;
};

const digitCount = (s) => s.replace(/\D/g, '').length;

export const STRUCTURED = [
  { type: 'EMAIL', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g },
  { type: 'IBAN', re: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g, valid: ibanOk },
  { type: 'CARD', re: /\b\d(?:[ -]?\d){12,18}\b/g, valid: (m) => luhn(m.replace(/\D/g, '')) },
  { type: 'PHONE', re: /\+?\(?\d{1,4}\)?(?:[ .-]?\d{2,4}){2,5}\b/g, valid: (m) => digitCount(m) >= 9 && digitCount(m) <= 15 },
];

export function structuredSpans(text) {
  const spans = [];
  STRUCTURED.forEach(({ type, re, valid }, priority) => {
    for (const m of text.matchAll(re)) {
      if (!valid || valid(m[0])) spans.push({ type, start: m.index, end: m.index + m[0].length, priority, source: 'rule' });
    }
  });
  return spans;
}

// ---- Dictionary detector: names you already know are sensitive -----------------------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word, case-insensitive matches for a local list, such as your
// customers' company names synced from the CRM. Longest terms win.
export function dictionarySpans(text, terms, type = 'ORG') {
  if (!terms.length) return [];
  const sorted = [...terms].sort((a, b) => b.length - a.length).map(escapeRe);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${sorted.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  return [...text.matchAll(re)].map((m) => ({ type, start: m.index, end: m.index + m[0].length, priority: 5, source: 'dictionary' }));
}

// ---- Learned detector: token labels -> whole-word spans ------------------------------

const TYPE = { PER: 'PERSON', ORG: 'ORG', LOC: 'LOCATION', MISC: 'MISC' };

// `logits` is the flat [1, seq, labels] output; token i of `encoded.tokens` is
// at sequence position i + 1 because of [CLS].
export function nerSpans(text, encoded, logits, labels) {
  const n = labels.length;
  const words = [];
  encoded.tokens.forEach((token, i) => {
    const row = (i + 1) * n;
    let best = 0;
    for (let k = 1; k < n; k++) if (logits[row + k] > logits[row + best]) best = k;
    const last = words[words.length - 1];
    if (last && last.word === token.word) last.labels.push(labels[best]);
    else words.push({ word: token.word, labels: [labels[best]] });
  });

  // For redaction, coverage matters more than the label: a word is an entity
  // if any of its pieces is, and it takes the type of its first entity piece.
  const spans = [];
  for (const { word, labels: pieceLabels } of words) {
    const hit = pieceLabels.find((l) => l !== 'O');
    if (!hit) continue;
    const type = TYPE[hit.slice(2)] ?? hit.slice(2);
    const prev = spans[spans.length - 1];
    if (prev && prev.type === type && /^\s?$/.test(text.slice(prev.end, word.start))) prev.end = word.end;
    else spans.push({ type, start: word.start, end: word.end, priority: 10, source: 'model' });
  }
  return spans;
}

// ---- Policy, merging, placeholders ------------------------------------------------------

export const DEFAULT_POLICY = {
  redact: new Set(['PERSON', 'LOCATION', 'ORG', 'EMAIL', 'PHONE', 'CARD', 'IBAN']),
  allow: new Set(), // terms that must stay, like your own product names
};

// Overlapping spans merge into one, and the higher-priority detector names it.
export function mergeSpans(text, spans, policy = DEFAULT_POLICY) {
  const kept = spans
    .filter((s) => policy.redact.has(s.type) && !policy.allow.has(text.slice(s.start, s.end)))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  for (const s of kept) {
    const prev = out[out.length - 1];
    if (prev && s.start < prev.end) {
      if (s.priority < prev.priority) prev.type = s.type;
      prev.priority = Math.min(prev.priority, s.priority);
      prev.end = Math.max(prev.end, s.end);
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

export function createVault() {
  return { byKey: new Map(), byPlaceholder: new Map(), counts: {} };
}

const canonical = (s) => s.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

// The same value gets the same placeholder for the whole conversation, so the
// model can still tell "the customer" from "the colleague".
export function pseudonymize(text, spans, vault) {
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    const value = text.slice(s.start, s.end);
    const key = `${s.type}:${canonical(value)}`;
    let placeholder = vault.byKey.get(key);
    if (!placeholder) {
      vault.counts[s.type] = (vault.counts[s.type] ?? 0) + 1;
      placeholder = `[${s.type}_${vault.counts[s.type]}]`;
      vault.byKey.set(key, placeholder);
      vault.byPlaceholder.set(placeholder, value);
    }
    out += text.slice(cursor, s.start) + placeholder;
    cursor = s.end;
  }
  return out + text.slice(cursor);
}

export function rehydrate(text, vault) {
  return text.replace(/\[([A-Z]+)_(\d+)\]/g, (match) => vault.byPlaceholder.get(match) ?? match);
}
