import { parseAnswer, parseInline } from './answer-format';

describe('answer format', () => {
  it('splits bold text and citations', () => {
    expect(parseInline('Up to **5 days** carry over [1].')).toEqual([
      { kind: 'text', text: 'Up to ' },
      { kind: 'bold', text: '5 days' },
      { kind: 'text', text: ' carry over ' },
      { kind: 'cite', index: 1 },
      { kind: 'text', text: '.' },
    ]);
  });

  it('turns dash lines into a list', () => {
    const blocks = parseAnswer('Intro [1]\n\n- one [2]\n- two');
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'list']);
    expect(blocks[1].kind === 'list' && blocks[1].items.length).toBe(2);
  });

  it('hides a half-streamed bold marker', () => {
    expect(parseInline('Up to **5 da')).toEqual([{ kind: 'text', text: 'Up to 5 da' }]);
  });

  it('never produces markup from model text', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([{ kind: 'text', text: '<img src=x onerror=alert(1)>' }]);
  });
});
