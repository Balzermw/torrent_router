import type { ChromeMessagePayload, ChromeMessageType } from '../../models/message.model';
import type { ChromeMessage, ChromeMessageHandler } from '../webex.utils';
import type { InstalledDetails } from './chrome-download.utils';

import Port = chrome.runtime.Port;

import { onInstalled$ as _onInstalled$ } from '@dvcol/web-extension-utils';
import { filter, Observable } from 'rxjs';

import { LoggerService } from '../../services/logger/logger.service';

const transientRuntimeErrorRegex = /receiving end does not exist|could not establish connection|extension context invalidated|message port closed/i;

function getRuntime(): typeof chrome.runtime | undefined {
  try {
    return typeof chrome === 'undefined' ? undefined : chrome.runtime;
  } catch {
    return undefined;
  }
}

function getTabs(): typeof chrome.tabs | undefined {
  try {
    return typeof chrome === 'undefined' ? undefined : chrome.tabs;
  } catch {
    return undefined;
  }
}

function getRuntimeOnMessage(): typeof chrome.runtime.onMessage | undefined {
  try {
    return typeof chrome === 'undefined' ? undefined : chrome.runtime?.onMessage;
  } catch {
    return undefined;
  }
}

function getRuntimeOnConnect(): typeof chrome.runtime.onConnect | undefined {
  try {
    return typeof chrome === 'undefined' ? undefined : chrome.runtime?.onConnect;
  } catch {
    return undefined;
  }
}

function getLastRuntimeError(): Error | undefined {
  const message = getRuntime()?.lastError?.message;
  return message ? new Error(message) : undefined;
}

function isTransientRuntimeError(error: Error): boolean {
  return transientRuntimeErrorRegex.test(error.message);
}

function noopEvent<T extends (...args: any[]) => void>(): chrome.events.Event<T> {
  return {
    addListener: () => undefined,
    removeListener: () => undefined,
    hasListener: () => false,
    hasListeners: () => false,
  } as unknown as chrome.events.Event<T>;
}

function noopPort(name = 'unavailable'): Port {
  return {
    name,
    disconnect: () => undefined,
    onDisconnect: noopEvent(),
    onMessage: noopEvent(),
    postMessage: () => undefined,
  };
}

function sendMessageCallback<R>(subscriber: { next: (value: R) => void; error: (error: unknown) => void; complete: () => void }, label: string) {
  return (response?: { success?: boolean; payload?: R; error?: unknown } | R) => {
    const runtimeError = getLastRuntimeError();
    if (runtimeError) {
      if (isTransientRuntimeError(runtimeError)) {
        LoggerService.debug(`${label} skipped.`, runtimeError.message);
        subscriber.complete();
        return;
      }

      subscriber.error(runtimeError);
      return;
    }

    const maybeResponse = response as { success?: boolean; payload?: R; error?: unknown } | undefined;
    if (maybeResponse?.success === false) {
      subscriber.error(maybeResponse.error);
    } else if (maybeResponse?.success) {
      subscriber.next(maybeResponse.payload as R);
      subscriber.complete();
    } else {
      subscriber.next(response as R);
      subscriber.complete();
    }
  };
}

/**
 * Rxjs wrapper for chrome.runtime.onMessage event listener
 * @param types optional type filtering
 * @param async if the listener waits for async response or not
 * @see chrome.runtime.onMessage
 */
export function onMessage<P extends ChromeMessagePayload = ChromeMessagePayload, R = any>(types?: ChromeMessageType[], async = true): Observable<ChromeMessageHandler<ChromeMessageType, P, R>> {
  return new Observable<ChromeMessageHandler<ChromeMessageType, P, R>>((subscriber) => {
    const messageEvent = getRuntimeOnMessage();
    if (!messageEvent) {
      LoggerService.debug('Runtime message listener is unavailable; skipping subscription.');
      subscriber.complete();
      return undefined;
    }

    const wrapper = (message: ChromeMessage<ChromeMessageType, P>, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
      subscriber.next({ message, sender, sendResponse });
      return async;
    };

    messageEvent.addListener(wrapper);

    return () => {
      try {
        getRuntimeOnMessage()?.removeListener(wrapper);
      } catch (error) {
        LoggerService.debug('Runtime message listener cleanup skipped.', error);
      }
    };
  }).pipe(filter(({ message }) => !types?.length || !!types.includes(message?.type)));
}

/**
 * Rxjs wrapper for chrome.runtime.sendMessage event sender
 * @param message the ChromeMessage to send
 * @see chrome.runtime.sendMessage
 */
export function sendMessage<P extends ChromeMessagePayload = ChromeMessagePayload, R = void>(message: ChromeMessage<ChromeMessageType, P>): Observable<R> {
  LoggerService.debug(`Sending '${message.type}' message`, message);
  return new Observable<R>((subscriber) => {
    const runtime = getRuntime();
    if (!runtime?.sendMessage) {
      LoggerService.debug(`Runtime sender is unavailable for '${message.type}'.`);
      subscriber.complete();
      return undefined;
    }

    try {
      runtime.sendMessage(message, sendMessageCallback<R>(subscriber, `Runtime message '${message.type}'`));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (isTransientRuntimeError(err)) {
        LoggerService.debug(`Runtime message '${message.type}' skipped.`, err.message);
        subscriber.complete();
      } else {
        subscriber.error(error);
      }
    }

    return undefined;
  });
}

/**
 * Rxjs wrapper for chrome.tabs.sendMessage event sender
 * @param tabId the id of the target tab
 * @param message the ChromeMessage to send
 * @see chrome.tabs.sendMessage
 */
export function sendTabMessage<P extends ChromeMessagePayload = ChromeMessagePayload, R = void>(tabId: number, message: ChromeMessage<ChromeMessageType, P>): Observable<R> {
  LoggerService.debug(`Sending '${message.type}' message to active tab '${tabId}'`, { message, tabId });
  return new Observable<R>((subscriber) => {
    const tabs = getTabs();
    if (!tabs?.sendMessage) {
      LoggerService.debug(`Tab sender is unavailable for '${message.type}'.`, { tabId });
      subscriber.complete();
      return undefined;
    }

    try {
      tabs.sendMessage(tabId, message, sendMessageCallback<R>(subscriber, `Tab message '${message.type}'`));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (isTransientRuntimeError(err)) {
        LoggerService.debug(`Tab message '${message.type}' skipped.`, { tabId, error: err.message });
        subscriber.complete();
      } else {
        subscriber.error(error);
      }
    }

    return undefined;
  });
}

/**
 * Rxjs wrapper for chrome.tabs.sendMessage event sender and chrome.tabs.query
 * @param message the ChromeMessage to send
 * @see chrome.tabs.sendMessage
 * @see chrome.tabs.sendMessage
 */
export function sendActiveTabMessage<P extends ChromeMessagePayload = ChromeMessagePayload, R = void>(message: ChromeMessage<ChromeMessageType, P>): Observable<R> {
  return new Observable<R>((subscriber) => {
    const tabs = getTabs();
    if (!tabs?.query) {
      LoggerService.debug(`Active tab sender is unavailable for '${message.type}'.`);
      subscriber.complete();
      return undefined;
    }

    void tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (!tab?.id) {
          LoggerService.debug(`No active tab found for '${message.type}'.`);
          subscriber.complete();
          return;
        }

        sendTabMessage<P, R>(tab.id, message).subscribe(subscriber);
      })
      .catch((error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        if (isTransientRuntimeError(err)) {
          LoggerService.debug(`Active tab message '${message.type}' skipped.`, err.message);
          subscriber.complete();
        } else {
          subscriber.error(error);
        }
      });

    return undefined;
  });
}

/**
 * Rxjs wrapper for chrome.runtime.onConnect event listener
 * @param types optional type filtering
 * @param async if the listener waits for async response or not
 * @see chrome.runtime.onConnect
 */
export function onConnect<T extends string>(types?: T[], async = true): Observable<Port> {
  return new Observable<Port>((subscriber) => {
    const connectEvent = getRuntimeOnConnect();
    if (!connectEvent) {
      LoggerService.debug('Runtime connect listener is unavailable; skipping subscription.');
      subscriber.complete();
      return undefined;
    }

    const wrapper = (port: Port) => {
      subscriber.next(port);
      return async;
    };

    connectEvent.addListener(wrapper);

    return () => {
      try {
        getRuntimeOnConnect()?.removeListener(wrapper);
      } catch (error) {
        LoggerService.debug('Runtime connect listener cleanup skipped.', error);
      }
    };
  }).pipe(filter(({ name }) => !types?.length || !!types.map(String).includes(name)));
}

/** @see chrome.runtime.connect */
export const portConnect = ((extensionIdOrConnectInfo?: string | chrome.runtime.ConnectInfo, connectInfo?: chrome.runtime.ConnectInfo): Port => {
  const runtime = getRuntime();
  if (!runtime?.connect) {
    LoggerService.debug('Runtime port connection is unavailable.');
    return noopPort(typeof extensionIdOrConnectInfo === 'string' ? extensionIdOrConnectInfo : extensionIdOrConnectInfo?.name);
  }

  try {
    if (typeof extensionIdOrConnectInfo === 'string') return runtime.connect(extensionIdOrConnectInfo, connectInfo);
    return runtime.connect(extensionIdOrConnectInfo);
  } catch (error) {
    LoggerService.debug('Runtime port connection skipped.', error);
    return noopPort(typeof extensionIdOrConnectInfo === 'string' ? extensionIdOrConnectInfo : extensionIdOrConnectInfo?.name);
  }
}) as typeof chrome.runtime.connect;

export const onInstalled$: Observable<InstalledDetails> = _onInstalled$;
