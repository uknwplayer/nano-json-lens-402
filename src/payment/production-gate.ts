import { createNanoPaymentGate, type ResourceServerLike } from '../payment.ts';
import type { PaymentGate } from '../server.ts';
import type { InitializableResourceServer, PaymentBootstrap } from './bootstrap.ts';
import type { PaymentStateStore } from './store.ts';

type ReadyProductionResourceServer = ResourceServerLike & InitializableResourceServer;

export interface ProductionNanoPaymentGateOptions<
  T extends ReadyProductionResourceServer = ReadyProductionResourceServer,
> {
  readonly bootstrap: PaymentBootstrap<T>;
  readonly stateStore: PaymentStateStore;
  readonly payTo: string;
  readonly priceXno: string;
  readonly facilitatorUrl: string;
}

/**
 * Compose the production Nano payment gate only from infrastructure that has
 * already crossed the explicit readiness boundary.
 *
 * The generic payment gate keeps a looser contract for isolated tests and local
 * development. This production boundary is intentionally stricter: facilitator
 * initialization must already be GREEN and replay state must advertise itself as
 * production-safe before a gate can be constructed.
 */
export function createProductionNanoPaymentGate<T extends ReadyProductionResourceServer>(
  options: ProductionNanoPaymentGateOptions<T>,
): PaymentGate {
  if (!options.bootstrap.isReady()) {
    throw new Error('Payment bootstrap must be ready before constructing a production gate.');
  }
  if (options.stateStore.productionSafe !== true) {
    throw new Error('A production-safe payment state store is required.');
  }

  const resourceServer = options.bootstrap.getReadyResourceServer();

  return createNanoPaymentGate({
    payTo: options.payTo,
    priceXno: options.priceXno,
    facilitatorUrl: options.facilitatorUrl,
    resourceServer,
    stateStore: options.stateStore,
  });
}
