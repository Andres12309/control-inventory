let dbInitFinished = false;

export function markDbInitFinished(): void {
  dbInitFinished = true;
}

export function isDbInitFinished(): boolean {
  return dbInitFinished;
}

export function waitForDbInit(timeoutMs = 4000): Promise<void> {
  if (dbInitFinished) return Promise.resolve();

  return new Promise((resolve) => {
    const started = Date.now();
    const tick = setInterval(() => {
      if (dbInitFinished || Date.now() - started >= timeoutMs) {
        clearInterval(tick);
        resolve();
      }
    }, 50);
  });
}
