export type LexicalMetrics = { tokens: number; uniqueTokens: number; diversity: number };
export function lexicalMetrics(text: string): LexicalMetrics {
  const tokens = text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+(?:[+#.][\p{L}\p{N}+#]*)*/gu) ?? [];
  const uniqueTokens = new Set(tokens).size;
  return { tokens: tokens.length, uniqueTokens, diversity: tokens.length ? Math.round(uniqueTokens / tokens.length * 1000) / 10 : 0 };
}
export function percentage(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round(numerator / denominator * 1000) / 10 : 0;
}
