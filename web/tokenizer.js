// A BERT WordPiece tokenizer (cased) that keeps character offsets, so model
// predictions can be mapped back onto the original text. It matches the
// Hugging Face fast tokenizer for the models used here; tokenizer.test.mjs
// checks that on every test sentence.

const isWhitespace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || /\p{Zs}/u.test(c);
const isControl = (c) => c !== '\t' && c !== '\n' && c !== '\r' && /\p{Cc}|\p{Cf}/u.test(c);
const isPunctuation = (c) => {
  const cp = c.codePointAt(0);
  if ((cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126)) return true;
  return /\p{P}/u.test(c);
};
const isCjk = (cp) =>
  (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0x20000 && cp <= 0x2a6df) ||
  (cp >= 0x2a700 && cp <= 0x2b73f) || (cp >= 0x2b740 && cp <= 0x2b81f) || (cp >= 0x2b820 && cp <= 0x2ceaf) ||
  (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0x2f800 && cp <= 0x2fa1f);

export class WordPiece {
  constructor(vocabText, { maxLength = 128, maxCharsPerWord = 100 } = {}) {
    this.vocab = new Map(vocabText.split('\n').map((t, i) => [t.replace(/\r$/, ''), i]));
    this.maxLength = maxLength;
    this.maxCharsPerWord = maxCharsPerWord;
    for (const t of ['[CLS]', '[SEP]', '[PAD]', '[UNK]']) {
      if (!this.vocab.has(t)) throw new Error(`vocab is missing ${t}`);
    }
  }

  // Splits text into words, each with UTF-16 start/end offsets into the text.
  words(text) {
    const out = [];
    let word = null;
    const flush = () => {
      if (word) out.push(word);
      word = null;
    };
    for (let i = 0; i < text.length; ) {
      const cp = text.codePointAt(i);
      const c = String.fromCodePoint(cp);
      const next = i + c.length;
      if (cp === 0 || cp === 0xfffd || isControl(c)) {
        flush();
      } else if (isWhitespace(c)) {
        flush();
      } else if (isPunctuation(c) || isCjk(cp)) {
        flush();
        out.push({ text: c, start: i, end: next });
      } else if (word) {
        word.text += c;
        word.end = next;
      } else {
        word = { text: c, start: i, end: next };
      }
      i = next;
    }
    flush();
    return out;
  }

  // Greedy longest-match-first, the way BERT's WordPiece works.
  pieces(word) {
    const chars = [...word.text];
    if (chars.length > this.maxCharsPerWord) return [{ id: this.vocab.get('[UNK]'), start: word.start, end: word.end, word: word }];
    const out = [];
    let start = 0;
    let offset = word.start;
    while (start < chars.length) {
      let end = chars.length;
      let found = null;
      while (start < end) {
        const sub = (start > 0 ? '##' : '') + chars.slice(start, end).join('');
        if (this.vocab.has(sub)) {
          found = sub;
          break;
        }
        end--;
      }
      if (!found) return [{ id: this.vocab.get('[UNK]'), start: word.start, end: word.end, word }];
      const length = chars.slice(start, end).join('').length;
      out.push({ id: this.vocab.get(found), start: offset, end: offset + length, word });
      offset += length;
      start = end;
    }
    return out;
  }

  // Returns model inputs plus, for every token, the character span it covers.
  encode(text) {
    const tokens = [];
    for (const w of this.words(text)) tokens.push(...this.pieces(w));
    const room = this.maxLength - 2;
    const kept = tokens.slice(0, room);
    const ids = [this.vocab.get('[CLS]'), ...kept.map((t) => t.id), this.vocab.get('[SEP]')];
    const mask = ids.map(() => 1);
    while (ids.length < this.maxLength) {
      ids.push(this.vocab.get('[PAD]'));
      mask.push(0);
    }
    return {
      inputIds: BigInt64Array.from(ids, BigInt),
      attentionMask: BigInt64Array.from(mask, BigInt),
      tokens: kept, // aligned with positions 1..kept.length
      truncated: tokens.length > room,
    };
  }
}
