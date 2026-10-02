import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const inject = vi.hoisted(() => vi.fn(async (_onDestroy?: () => void) => {}));
vi.mock('./modules/inject-content-app', () => ({ injectContentApp: inject }));
vi.mock('../../services/logger/logger.service', () => ({ LoggerService: { debug: vi.fn(), error: vi.fn() } }));

const context = globalThis as typeof globalThis & { torrentRouterInitialized?: boolean };

describe('content initialization lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    inject.mockClear();
    delete context.torrentRouterInitialized;
  });
  afterEach(() => {
    delete context.torrentRouterInitialized;
  });

  it('preserves the active popup on reinjection but restarts after its root is destroyed', async () => {
    await import('./index');
    expect(inject).toHaveBeenCalledTimes(1);
    vi.resetModules();
    await import('./index');
    expect(inject).toHaveBeenCalledTimes(1);
    inject.mock.calls[0][0]!();
    expect(context.torrentRouterInitialized).toBe(false);
    vi.resetModules();
    await import('./index');
    expect(inject).toHaveBeenCalledTimes(2);
  });
});
