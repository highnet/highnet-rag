import { readFileSync } from 'node:fs';
import path from 'node:path';

type Listener = (event: MessageEvent<string>) => void;

// Replays a recorded SSE stream (test/fixtures/run.sse) through the EventSource API.
export class FakeEventSource {
  static fixture = readFileSync(path.join(__dirname, 'fixtures/run.sse'), 'utf8');
  static lastUrl = '';

  onerror: (() => void) | null = null;
  private listeners = new Map<string, Listener[]>();
  private closed = false;

  constructor(url: string) {
    FakeEventSource.lastUrl = url;
    setTimeout(() => this.replay(), 0);
  }

  addEventListener = (name: string, listener: Listener) => {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  };

  close = () => {
    this.closed = true;
  };

  private replay = () => {
    for (const block of FakeEventSource.fixture.split('\n\n')) {
      if (this.closed) return;
      const [eventLine, dataLine] = block.split('\n');
      if (!eventLine?.startsWith('event: ') || !dataLine) continue;
      const name = eventLine.slice('event: '.length);
      const event = new MessageEvent<string>(name, { data: dataLine.slice('data: '.length) });
      this.listeners.get(name)?.forEach((listener) => listener(event));
    }
  };
}
