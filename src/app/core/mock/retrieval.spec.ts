import { seedDocuments } from './corpus';
import { chunkText, composeAnswer, confidenceFor, expandQuery, findCurated, search } from './retrieval';

describe('retrieval', () => {
  const docs = seedDocuments();

  it('finds the parental leave section for a question in everyday words', () => {
    const results = search('How long is maternity leave?', docs);
    expect(results[0].document.id).toBe('parental');
    expect(confidenceFor(results)).not.toBe('none');
  });

  it('maps employee vocabulary to policy vocabulary', () => {
    expect(expandQuery('vacation days')).toEqual(expect.arrayContaining(['vacation', 'paid', 'time', 'off', 'day']));
  });

  it('refuses to answer questions the policies do not cover', () => {
    const results = search('Can I bring my dog to the office?', docs);
    expect(confidenceFor(results)).toBe('none');
  });

  it('only searches the documents it is given', () => {
    const financeOnly = docs.filter((d) => d.collectionId === 'finance');
    expect(search('parental leave caregiver', financeOnly).every((r) => r.document.collectionId === 'finance')).toBe(true);
  });

  it('cites every source it uses in a composed answer', () => {
    const results = search('mileage reimbursement for my car', docs);
    const { answer, used } = composeAnswer('mileage reimbursement for my car', results);
    used.forEach((_, i) => expect(answer).toContain(`[${i + 1}]`));
    expect(used[0].chunk.heading).toBe('Mileage');
  });

  it('recognises a suggested question even when rephrased slightly', () => {
    expect(findCurated('can I carry over my unused vacation days')?.chunkIds).toContain('handbook-3');
    expect(findCurated('what is the meaning of life')).toBeUndefined();
  });

  it('chunks markdown by heading and paragraph', () => {
    const chunks = chunkText('doc', '# Leave\n\nYou get ten days of bereavement leave per year.\n\n# Requests\nTell your manager and record it in the HR portal.');
    expect(chunks.map((c) => c.heading)).toEqual(['Leave', 'Requests']);
    expect(chunks[1].text).toBe('Tell your manager and record it in the HR portal.');
  });
});
