import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server';
import { ExactNanoScheme } from '@x402nano/exact/server';

export interface ProductionNanoResourceServerOptions {
  readonly facilitatorUrl: string;
}

/**
 * Construct the production x402 Nano resource server without performing network I/O.
 * Initialization is deliberately left to the runtime bootstrap so construction can be
 * tested offline and no payer seed/private key is ever required by this server adapter.
 */
export function createProductionNanoResourceServer(
  options: ProductionNanoResourceServerOptions,
): x402ResourceServer {
  const facilitatorUrl = new URL(options.facilitatorUrl);
  if (facilitatorUrl.protocol !== 'https:') {
    throw new Error('Facilitator URL must use HTTPS.');
  }

  const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl.toString() });
  const resourceServer = new x402ResourceServer(facilitator);
  resourceServer.register('nano:mainnet', new ExactNanoScheme());
  return resourceServer;
}
