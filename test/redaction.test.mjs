// Scores the browser run's model spans under three redaction policies, using
// the names and companies that appear in data/sentences.txt.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DEFAULT_POLICY, createVault, dictionarySpans, mergeSpans, pseudonymize, structuredSpans } from '../web/airlock.js';

const { people, companies } = JSON.parse(readFileSync(new URL('../data/entities.json', import.meta.url), 'utf8'));
const runs = JSON.parse(readFileSync(new URL('../out/browser-results.json', import.meta.url), 'utf8')).runs;
const examples = runs.find((r) => r.examples).examples;
const withMisc = { ...DEFAULT_POLICY, redact: new Set([...DEFAULT_POLICY.redact, 'MISC']) };

function score(apply) {
  let names = 0, namesLeft = 0, orgs = 0, orgsLeft = 0;
  for (const { text, modelSpans } of examples) {
    const safe = pseudonymize(text, apply(text, modelSpans), createVault());
    for (const p of people) if (text.includes(p)) { names++; if (p.split(' ').some((part) => safe.includes(part))) namesLeft++; }
    for (const c of companies) if (text.includes(c)) { orgs++; if (safe.includes(c)) orgsLeft++; }
  }
  return { names: `${names - namesLeft}/${names}`, companies: `${orgs - orgsLeft}/${orgs}` };
}

test('every person name is redacted, under every policy', () => {
  assert.deepEqual(score((t, s) => mergeSpans(t, [...s, ...structuredSpans(t)])), { names: '44/44', companies: '18/27' });
  assert.deepEqual(score((t, s) => mergeSpans(t, [...s, ...structuredSpans(t)], withMisc)), { names: '44/44', companies: '27/27' });
  assert.deepEqual(score((t, s) => mergeSpans(t, [...s, ...structuredSpans(t), ...dictionarySpans(t, companies)], withMisc)), { names: '44/44', companies: '27/27' });
});

test('the dictionary detector matches whole words and escapes regex characters', () => {
  const text = 'Fabrikam and fabrikam-cloud, not Fabrikams. Acme (EU) Ltd. signed.';
  const found = dictionarySpans(text, ['Fabrikam', 'Acme (EU) Ltd.']).map((s) => text.slice(s.start, s.end));
  assert.deepEqual(found, ['Fabrikam', 'fabrikam', 'Acme (EU) Ltd.']);
});
