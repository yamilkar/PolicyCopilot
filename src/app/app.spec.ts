import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { RagApi } from './core/rag-api';
import { MockRagApi } from './core/mock/mock-rag-api';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: RagApi, useFactory: () => new MockRagApi(0) }],
    }).compileComponents();
  });

  it('renders the navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('nav a')].map((a) => a.textContent?.trim());
    expect(links).toEqual(['Ask', 'Documents', 'Insights']);
  });
});
