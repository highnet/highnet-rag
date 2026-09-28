import type { Stage, TraceEvent } from '@/lib/generated/trace';

type Status = TraceEvent['status'];

let seq = 0;

// Builds a trace event shaped exactly like the API's (see api/src/highnet_rag/trace.py).
export const ev = (
  stage: Stage,
  data: Record<string, unknown>,
  status: Status = 'ok',
): TraceEvent => {
  seq += 1;
  return {
    run_id: 'run',
    seq,
    stage,
    status,
    parent: null,
    label: String(seq),
    data,
    ms: 1200,
    tokens: 3,
    cost_usd: 0.00002,
  };
};

type Listener = (event: MessageEvent<string>) => void;

// An EventSource the test drives by hand: emit events, then fail or finish.
export class ControlledEventSource {
  static instances: ControlledEventSource[] = [];

  url: string;
  closed = false;
  onerror: (() => void) | null = null;
  private listeners = new Map<string, Listener[]>();

  constructor(url: string) {
    this.url = url;
    ControlledEventSource.instances.push(this);
  }

  addEventListener = (name: string, listener: Listener) => {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  };

  close = () => {
    this.closed = true;
  };

  emit = (name: string, data: unknown) => {
    const event = new MessageEvent<string>(name, { data: JSON.stringify(data) });
    this.listeners.get(name)?.forEach((listener) => listener(event));
  };

  fail = () => this.onerror?.();

  static last = () => ControlledEventSource.instances.at(-1) as ControlledEventSource;
}
