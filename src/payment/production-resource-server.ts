import {
  HTTPFacilitatorClient,
  x402ResourceServer,
  type ResourceConfig,
} from '@x402/core/server';
import type {
  PaymentPayload as CorePaymentPayload,
  PaymentRequirements as CorePaymentRequirements,
  ResourceInfo as CoreResourceInfo,
} from '@x402/core/types';
import { ExactNanoScheme } from '@x402nano/exact/server';
import type {
  PaymentRequirements,
  PaymentResourceConfig,
  PaymentResourceInfo,
  ResourceServerLike,
} from '../payment.ts';
import {
  createPaymentBootstrap,
  type InitializableResourceServer,
  type PaymentBootstrap,
} from './bootstrap.ts';

export interface ProductionNanoResourceServerOptions {
  readonly facilitatorUrl: string;
}

export interface ProductionNanoResourceServer extends ResourceServerLike, InitializableResourceServer {
  hasRegisteredScheme(network: string, scheme: string): boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toCoreRequirement(requirement: PaymentRequirements): CorePaymentRequirements {
  if (requirement.scheme !== 'exact' || requirement.network !== 'nano:mainnet' ||
      typeof requirement.asset !== 'string' || typeof requirement.amount !== 'string' ||
      typeof requirement.payTo !== 'string' ||
      !Number.isInteger(requirement.maxTimeoutSeconds) || requirement.maxTimeoutSeconds! <= 0) {
    throw new Error('Invalid production Nano payment requirements.');
  }

  return {
    scheme: 'exact',
    network: 'nano:mainnet',
    asset: requirement.asset,
    amount: requirement.amount,
    payTo: requirement.payTo,
    maxTimeoutSeconds: requirement.maxTimeoutSeconds!,
    ...(requirement.extra === undefined ? {} : { extra: requirement.extra }),
  };
}

function requirementFromUnknown(value: unknown): PaymentRequirements {
  if (!isRecord(value) || typeof value.scheme !== 'string' || typeof value.network !== 'string' ||
      typeof value.asset !== 'string' || typeof value.amount !== 'string' ||
      typeof value.payTo !== 'string' ||
      !Number.isInteger(value.maxTimeoutSeconds) || (value.maxTimeoutSeconds as number) <= 0 ||
      (value.extra !== undefined && !isRecord(value.extra))) {
    throw new Error('Malformed x402 payment requirements.');
  }

  return {
    scheme: value.scheme,
    network: value.network,
    asset: value.asset,
    amount: value.amount,
    payTo: value.payTo,
    maxTimeoutSeconds: value.maxTimeoutSeconds as number,
    ...(value.extra === undefined ? {} : { extra: value.extra }),
  };
}

function toCoreResourceInfo(resource: PaymentResourceInfo): CoreResourceInfo {
  if (typeof resource.url !== 'string') throw new Error('Invalid x402 resource URL.');
  return {
    url: resource.url,
    ...(resource.description === undefined ? {} : { description: resource.description }),
    ...(resource.mimeType === undefined ? {} : { mimeType: resource.mimeType }),
  };
}

function resourceInfoFromUnknown(value: unknown): PaymentResourceInfo {
  if (!isRecord(value) || typeof value.url !== 'string' ||
      (value.description !== undefined && typeof value.description !== 'string') ||
      (value.mimeType !== undefined && typeof value.mimeType !== 'string')) {
    throw new Error('Malformed x402 resource information.');
  }
  return {
    url: value.url,
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    ...(typeof value.mimeType === 'string' ? { mimeType: value.mimeType } : {}),
  };
}

function toCorePaymentPayload(value: unknown): CorePaymentPayload {
  if (!isRecord(value) || value.x402Version !== 2 || !isRecord(value.payload)) {
    throw new Error('Malformed x402 payment payload.');
  }

  const accepted = toCoreRequirement(requirementFromUnknown(value.accepted));
  const resource = value.resource === undefined
    ? undefined
    : toCoreResourceInfo(resourceInfoFromUnknown(value.resource));
  if (value.extensions !== undefined && !isRecord(value.extensions)) {
    throw new Error('Malformed x402 payment extensions.');
  }

  return {
    x402Version: 2,
    accepted,
    payload: value.payload,
    ...(resource === undefined ? {} : { resource }),
    ...(value.extensions === undefined ? {} : { extensions: value.extensions }),
  };
}

function adaptResourceServer(resourceServer: x402ResourceServer): ProductionNanoResourceServer {
  return Object.freeze({
    initialize(): Promise<void> {
      return resourceServer.initialize();
    },
    hasRegisteredScheme(network: string, scheme: string): boolean {
      return resourceServer.hasRegisteredScheme(network, scheme);
    },
    async buildPaymentRequirements(config: PaymentResourceConfig): Promise<PaymentRequirements[]> {
      if (config.scheme !== 'exact' || config.network !== 'nano:mainnet') {
        throw new Error('Unsupported production Nano payment configuration.');
      }
      const coreConfig: ResourceConfig = {
        scheme: 'exact',
        network: 'nano:mainnet',
        price: config.price,
        payTo: config.payTo,
        ...(config.extra === undefined ? {} : { extra: config.extra }),
      };
      const requirements = await resourceServer.buildPaymentRequirements(coreConfig);
      return requirements.map(requirement => ({
        scheme: requirement.scheme,
        network: requirement.network,
        asset: requirement.asset,
        amount: requirement.amount,
        payTo: requirement.payTo,
        maxTimeoutSeconds: requirement.maxTimeoutSeconds,
        ...(requirement.extra === undefined ? {} : { extra: requirement.extra }),
      }));
    },
    async createPaymentRequiredResponse(
      requirements: PaymentRequirements[],
      resource: PaymentResourceInfo,
    ): Promise<Record<string, unknown>> {
      const response = await resourceServer.createPaymentRequiredResponse(
        requirements.map(toCoreRequirement),
        toCoreResourceInfo(resource),
      );
      return { ...response };
    },
    async verifyPayment(payload: unknown, requirements: PaymentRequirements): Promise<{ isValid: boolean }> {
      const result = await resourceServer.verifyPayment(
        toCorePaymentPayload(payload),
        toCoreRequirement(requirements),
      );
      return { isValid: result.isValid };
    },
    async settlePayment(payload: unknown, requirements: PaymentRequirements): Promise<Record<string, unknown>> {
      const result = await resourceServer.settlePayment(
        toCorePaymentPayload(payload),
        toCoreRequirement(requirements),
      );
      if (result.success !== true) return { success: false };
      return {
        success: true,
        transaction: result.transaction,
        network: result.network,
        ...(result.payer === undefined ? {} : { payer: result.payer }),
      };
    },
  });
}

/**
 * Construct the production x402 Nano resource server without performing network I/O.
 * The concrete vendor SDK is isolated behind the project's validated ResourceServerLike
 * boundary so its stricter protocol types do not leak into the generic payment core.
 */
export function createProductionNanoResourceServer(
  options: ProductionNanoResourceServerOptions,
): ProductionNanoResourceServer {
  const facilitatorUrl = new URL(options.facilitatorUrl);
  if (facilitatorUrl.protocol !== 'https:') {
    throw new Error('Facilitator URL must use HTTPS.');
  }

  const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl.toString() });
  const concrete = new x402ResourceServer(facilitator);
  concrete.register('nano:mainnet', new ExactNanoScheme());
  return adaptResourceServer(concrete);
}

/**
 * Construct the production resource server behind the fail-closed bootstrap boundary.
 * Creating this object remains offline; callers must explicitly await initialize()
 * before the underlying x402 resource server can be obtained.
 */
export function createProductionNanoPaymentBootstrap(
  options: ProductionNanoResourceServerOptions,
): PaymentBootstrap<ProductionNanoResourceServer> {
  return createPaymentBootstrap(createProductionNanoResourceServer(options));
}
