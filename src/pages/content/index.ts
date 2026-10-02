import { LoggerService } from '../../services/logger/logger.service';
import { injectContentApp } from './modules/inject-content-app';

// A worker wake-up may inject this bundle into an already initialized isolated world.
const contentContext = globalThis as typeof globalThis & { torrentRouterInitialized?: boolean };
if (!contentContext.torrentRouterInitialized) {
  contentContext.torrentRouterInitialized = true;
  void injectContentApp(() => {
    contentContext.torrentRouterInitialized = false;
  })
    .then(() => LoggerService.debug('Content script component rendered.'))
    .catch((err) => {
      contentContext.torrentRouterInitialized = false;
      LoggerService.error('Content script component failed to render.', err);
    });
}
