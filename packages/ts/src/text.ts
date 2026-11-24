/**
 * String helpers matching Python's `str` semantics, which count code points
 * and use a different whitespace set from `String.prototype.trim`.
 */

const WS =
  "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const LEADING = new RegExp(`^[${WS}]+`);
const TRAILING = new RegExp(`[${WS}]+$`);

export function lstrip(text: string): string {
  return text.replace(LEADING, "");
}

export function rstrip(text: string): string {
  return text.replace(TRAILING, "");
}

export function strip(text: string): string {
  return rstrip(lstrip(text));
}

export function codePointLength(text: string): number {
  let length = 0;
  for (const _ of text) {
    length++;
  }
  return length;
}

export function ljust(text: string, width: number): string {
  const length = codePointLength(text);
  return length >= width ? text : text + " ".repeat(width - length);
}
