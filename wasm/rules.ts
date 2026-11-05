// Entry point for the WebAssembly build. It imports the same rule engine the
// browser demo runs as JavaScript (../web/airlock.js), so both builds run one
// source file.
import { structuredSpans, mergeSpans, createVault, pseudonymize } from '../web/airlock.js';

// Replaces emails, IBANs, card numbers and phone numbers with placeholders.
export function redact(text: string): string {
  const spans = mergeSpans(text, structuredSpans(text));
  return pseudonymize(text, spans, createVault());
}
