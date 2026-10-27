import { firstValueFrom, lastValueFrom, toArray } from 'rxjs';
import { AnswerEvent } from '../models';
import { MockRagApi } from './mock-rag-api';

describe('MockRagApi', () => {
  it('streams trace, tokens and then cited sources', async () => {
    const api = new MockRagApi(0);
    const events = await lastValueFrom(api.ask({ question: 'Can I carry over unused vacation days?', collectionIds: [] }).pipe(toArray()));

    expect(events[0].type).toBe('trace');
    expect(events.filter((e) => e.type === 'token').length).toBeGreaterThan(5);
    const done = events.at(-1) as Extract<AnswerEvent, { type: 'done' }>;
    expect(done.type).toBe('done');
    expect(done.confidence).toBe('high');
    expect(done.citations[0].chunkId).toBe('handbook-3');
  });

  it('says it does not know when the scope has no matching policy', async () => {
    const api = new MockRagApi(0);
    const events = await lastValueFrom(api.ask({ question: 'How much parental leave do I get in Spain?', collectionIds: ['finance'] }).pipe(toArray()));
    const done = events.at(-1) as Extract<AnswerEvent, { type: 'done' }>;
    expect(done.confidence).toBe('none');
  });

  it('indexes an uploaded markdown file so it can be asked about', async () => {
    const api = new MockRagApi(0);
    const file = new File(['# Bereavement\n\nYou get ten working days of paid bereavement leave.'], 'bereavement.md', { type: 'text/markdown' });
    const steps = await lastValueFrom(api.upload(file, 'hr').pipe(toArray()));
    expect(steps.at(-1)?.status).toBe('ready');

    const events = await lastValueFrom(api.ask({ question: 'How many days of bereavement leave?', collectionIds: [] }).pipe(toArray()));
    const done = events.at(-1) as Extract<AnswerEvent, { type: 'done' }>;
    expect(done.confidence).not.toBe('none');
    expect(done.citations[0].documentTitle).toBe('Bereavement');
  });

  it('rejects unsupported file types', async () => {
    const api = new MockRagApi(0);
    const steps = await lastValueFrom(api.upload(new File(['x'], 'photo.png'), 'hr').pipe(toArray()));
    expect(steps.at(-1)).toMatchObject({ status: 'failed', error: expect.stringContaining('.png') });
  });

  it('counts unanswered questions in the analytics', async () => {
    const api = new MockRagApi(0);
    await lastValueFrom(api.ask({ question: 'What is the airspeed of an unladen swallow?', collectionIds: [] }));
    const analytics = await firstValueFrom(api.analytics());
    expect(analytics.unanswered.some((u) => u.question.includes('swallow'))).toBe(true);
  });
});
