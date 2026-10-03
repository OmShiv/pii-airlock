import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createVault, mergeSpans, pseudonymize, rehydrate, structuredSpans } from '../web/airlock.js';
import { WordPiece } from '../web/tokenizer.js';

const out = new URL('../out/', import.meta.url);
const vocab = readFileSync(new URL('vocab.txt', out), 'utf8');
const reference = JSON.parse(readFileSync(new URL('reference.json', out), 'utf8'));

test('the JS tokenizer matches the Python tokenizer on every sentence', () => {
  const wp = new WordPiece(vocab);
  for (const ref of reference) {
    const enc = wp.encode(ref.text);
    const n = enc.tokens.length + 2;
    assert.deepEqual(Array.from(enc.inputIds.slice(0, n), Number), ref.ids, ref.text);
    assert.deepEqual(['', ...enc.tokens.map((t) => ref.text.slice(t.start, t.end)), ''], ref.pieces, ref.text);
  }
});

test('structured detectors find identifiers and skip look-alikes', () => {
  const text = 'Card 4111 1111 1111 1111, not 4111 1111 1111 1112. Call +1 206 555 0143 or mail priya.raman@example.com. ' +
    'IBAN GB82 WEST 1234 5698 7654 32. Order 88412 shipped 2026-03-01.';
  const found = structuredSpans(text).map((s) => [s.type, text.slice(s.start, s.end)]);
  assert.deepEqual(found.filter(([t]) => t !== 'PHONE'), [
    ['EMAIL', 'priya.raman@example.com'],
    ['IBAN', 'GB82 WEST 1234 5698 7654 32'],
    ['CARD', '4111 1111 1111 1111'],
  ]);
  const merged = mergeSpans(text, structuredSpans(text)).map((s) => [s.type, text.slice(s.start, s.end)]);
  assert.ok(merged.some(([t, v]) => t === 'PHONE' && v === '+1 206 555 0143'));
  assert.ok(!merged.some(([, v]) => v.includes('88412') || v.includes('2026-03-01') || v.includes('1112')));
  assert.equal(merged.filter(([t]) => t === 'CARD').length, 1);
});

test('placeholders are consistent and round-trip', () => {
  const text = 'Priya Raman asked about the refund. Please call Priya Raman at +1 206 555 0143.';
  const spans = mergeSpans(text, [
    { type: 'PERSON', start: 0, end: 11, priority: 10 },
    { type: 'PERSON', start: 48, end: 59, priority: 10 },
    ...structuredSpans(text),
  ]);
  const vault = createVault();
  const safe = pseudonymize(text, spans, vault);
  assert.equal(safe, '[PERSON_1] asked about the refund. Please call [PERSON_1] at [PHONE_1].');
  const reply = 'Hi [PERSON_1], we have refunded you and will call [PHONE_1] tomorrow.';
  assert.equal(rehydrate(reply, vault), 'Hi Priya Raman, we have refunded you and will call +1 206 555 0143 tomorrow.');
});
