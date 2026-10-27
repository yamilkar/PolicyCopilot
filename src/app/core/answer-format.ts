// Turns an answer like "Up to **5 days** [1]\n\n- item [2]" into blocks the template can render
// without innerHTML, so model output can never inject markup.

export type Inline = { kind: 'text'; text: string } | { kind: 'bold'; text: string } | { kind: 'cite'; index: number };

export type Block = { kind: 'paragraph'; inlines: Inline[] } | { kind: 'list'; items: Inline[][] };

export function parseAnswer(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split(/\n\s*\n/)) {
    const lines = raw.split('\n').filter((l) => l.trim());
    if (!lines.length) continue;
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      blocks.push({ kind: 'list', items: lines.map((l) => parseInline(l.replace(/^\s*[-*]\s+/, ''))) });
    } else {
      blocks.push({ kind: 'paragraph', inlines: parseInline(lines.join(' ')) });
    }
  }
  return blocks;
}

export function parseInline(text: string): Inline[] {
  const inlines: Inline[] = [];
  // **bold**, [n] citations; an unclosed ** while streaming is left as text until it closes.
  const pattern = /\*\*(.+?)\*\*|\[(\d+)\]/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) inlines.push({ kind: 'text', text: text.slice(last, match.index) });
    if (match[1] !== undefined) inlines.push({ kind: 'bold', text: match[1] });
    else inlines.push({ kind: 'cite', index: Number(match[2]) });
    last = match.index + match[0].length;
  }
  if (last < text.length) inlines.push({ kind: 'text', text: text.slice(last).replace(/\*\*/g, '') });
  return inlines;
}
