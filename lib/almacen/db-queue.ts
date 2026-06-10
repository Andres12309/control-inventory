/**
 * Serializa operaciones SQLite del módulo almacén.
 * En Android, consultas concurrentes sobre la misma conexión provocan
 * "Cannot use shared object that was already released".
 */
let tail: Promise<unknown> = Promise.resolve();

export function runAlmacenDb<T>(fn: () => Promise<T>): Promise<T> {
  const next = tail.then(fn, fn);
  tail = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}
