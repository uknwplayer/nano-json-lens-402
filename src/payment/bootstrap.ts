export type PaymentBootstrapStatus = 'cold' | 'initializing' | 'ready' | 'failed';

export interface InitializableResourceServer {
  initialize(): Promise<void>;
}

export interface PaymentBootstrap<T extends InitializableResourceServer> {
  status(): PaymentBootstrapStatus;
  isReady(): boolean;
  initialize(): Promise<T>;
  getReadyResourceServer(): T;
}

/**
 * Fail-closed initialization boundary for payment infrastructure.
 *
 * The wrapped resource server is never exposed through this boundary until its
 * initialization completes successfully. A failed bootstrap is terminal for that
 * bootstrap instance so an upstream uncertainty cannot trigger an implicit retry.
 */
export function createPaymentBootstrap<T extends InitializableResourceServer>(
  resourceServer: T,
): PaymentBootstrap<T> {
  let state: PaymentBootstrapStatus = 'cold';
  let initialization: Promise<T> | undefined;
  let failure: Error | undefined;

  function initialize(): Promise<T> {
    if (state === 'ready') return Promise.resolve(resourceServer);
    if (state === 'failed') {
      return Promise.reject(failure ?? new Error('Payment runtime initialization failed.'));
    }
    if (initialization !== undefined) return initialization;

    state = 'initializing';
    initialization = (async () => {
      try {
        await resourceServer.initialize();
        state = 'ready';
        return resourceServer;
      } catch (cause) {
        state = 'failed';
        failure = new Error('Payment runtime initialization failed.', { cause });
        throw failure;
      }
    })();

    return initialization;
  }

  return Object.freeze({
    status(): PaymentBootstrapStatus {
      return state;
    },
    isReady(): boolean {
      return state === 'ready';
    },
    initialize,
    getReadyResourceServer(): T {
      if (state !== 'ready') {
        throw new Error('Payment resource server is not ready.');
      }
      return resourceServer;
    },
  });
}
