let tail: Promise<unknown> = Promise.resolve();

export function runAlmacenDb<T>(fn: () => Promise<T>): Promise<T> {
  const next = tail.then(fn, fn);
  tail = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
