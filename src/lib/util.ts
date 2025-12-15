export function assert(b: boolean): asserts b {
  if (!b) {
    throw new Error("Assertion failed");
  }
}

export function unreachable(_: never): never {
  throw new Error("Should be unreachable");
}

export function tryParseFloat(s: string): number | undefined {
  const x = parseFloat(s);
  if (!isNaN(x)) {
    return x;
  }
}

export function sortByKeyCached<T>(ts: T[], getKey: (t: T) => number): void {
  const pairs: [number, T][] = [];
  for (const t of ts) {
    pairs.push([getKey(t), t]);
  }
  pairs.sort(([a], [b]) => a - b);
  for (let i = 0; i < ts.length; i++) {
    ts[i] = pairs[i][1];
  }
}

export function minByKey<T>(
  ts: Iterable<T>,
  f: (t: T) => number,
): T | undefined {
  let minKey = Infinity;
  let bestT: T | undefined;
  for (const t of ts) {
    const key = f(t);
    if (minKey > key) {
      minKey = key;
      bestT = t;
    }
  }
  return bestT;
}

export function maxByKey<T>(
  ts: Iterable<T>,
  f: (t: T) => number,
): T | undefined {
  let maxKey = -Infinity;
  let bestT: T | undefined;
  for (const t of ts) {
    const key = f(t);
    if (maxKey < key) {
      maxKey = key;
      bestT = t;
    }
  }
  return bestT;
}

export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export class Throttle<T> {
  queued = false;
  looping = false;
  t = undefined as T;

  constructor(
    readonly interval: number,
    private f: (t: T) => void,
  ) {}

  call(t: T): void {
    this.t = t;
    this.queued = true;
    if (!this.looping) {
      this.loop();
    }
  }

  private async loop(): Promise<void> {
    this.looping = true;
    while (this.queued) {
      this.f(this.t);
      this.queued = false;
      await sleep(this.interval);
    }
    this.looping = false;
  }
}
