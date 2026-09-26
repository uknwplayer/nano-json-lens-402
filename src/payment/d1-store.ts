import type { SettlementReceipt } from '../server.ts';
import type { PaymentState } from './state.ts';
import type { PaymentClaimResult, PaymentStateStore } from './store.ts';

interface D1RunResultLike {
  meta?: { changes?: number };
}

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  run(): Promise<D1RunResultLike>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
}

interface BindingRow {
  request_id: string;
  operation_id: string;
}

interface StateRow {
  state: string;
}

interface ReceiptRow {
  state: string;
  receipt_json: string | null;
}

const STATES = new Set<PaymentState>([
  'unverified',
  'verified',
  'settling',
  'settlement_unknown',
  'settled',
  'fulfilled',
]);

function assertIdentifier(value: string, label: string): void {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error(`${label} must be a 64-character hexadecimal identifier.`);
  }
}

function changes(result: D1RunResultLike): number {
  return Number(result.meta?.changes ?? 0);
}

function isPaymentState(value: string): value is PaymentState {
  return STATES.has(value as PaymentState);
}

function validateReceipt(value: unknown): SettlementReceipt | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  if (row.success !== true || row.network !== 'nano:mainnet' ||
      typeof row.transaction !== 'string' || !/^[0-9a-f]{64}$/i.test(row.transaction)) {
    return undefined;
  }
  if (row.payer !== undefined && (typeof row.payer !== 'string' || row.payer.length > 128)) {
    return undefined;
  }
  return Object.freeze({
    success: true,
    transaction: row.transaction,
    network: 'nano:mainnet',
    ...(typeof row.payer === 'string' ? { payer: row.payer } : {}),
  });
}

/** Durable production payment state backed by a Cloudflare D1 binding. */
export function createD1PaymentStateStore(database: D1DatabaseLike): PaymentStateStore {
  if (!database || typeof database.prepare !== 'function') {
    throw new Error('A D1 database binding is required.');
  }

  return Object.freeze({
    productionSafe: true,

    async claimPayment(
      paymentIdentity: string,
      requestId: string,
      operationId: string,
    ): Promise<PaymentClaimResult> {
      assertIdentifier(paymentIdentity, 'Payment identity');
      assertIdentifier(requestId, 'Request ID');
      assertIdentifier(operationId, 'Operation ID');

      const inserted = await database.prepare(
        `INSERT OR IGNORE INTO payment_operations
          (payment_identity, request_id, operation_id, state, receipt_json)
         VALUES (?, ?, ?, 'unverified', NULL)`,
      ).bind(paymentIdentity, requestId, operationId).run();
      if (changes(inserted) === 1) return { status: 'claimed' };

      const existing = await database.prepare(
        'SELECT request_id, operation_id FROM payment_operations WHERE payment_identity = ?',
      ).bind(paymentIdentity).first<BindingRow>();
      if (existing === null) {
        throw new Error('Payment claim conflict could not be resolved safely.');
      }
      if (existing.request_id !== requestId) return { status: 'conflict' };
      return { status: 'existing', operationId: existing.operation_id };
    },

    async getState(operationId: string): Promise<PaymentState | undefined> {
      assertIdentifier(operationId, 'Operation ID');
      const row = await database.prepare(
        'SELECT state FROM payment_operations WHERE operation_id = ?',
      ).bind(operationId).first<StateRow>();
      if (row === null) return undefined;
      if (!isPaymentState(row.state)) throw new Error('Stored payment state is invalid.');
      return row.state;
    },

    async compareAndSetState(
      operationId: string,
      expected: PaymentState,
      next: PaymentState,
    ): Promise<boolean> {
      assertIdentifier(operationId, 'Operation ID');
      const result = await database.prepare(
        'UPDATE payment_operations SET state = ? WHERE operation_id = ? AND state = ?',
      ).bind(next, operationId, expected).run();
      return changes(result) === 1;
    },

    async confirmSettlement(operationId: string, receipt: SettlementReceipt): Promise<boolean> {
      assertIdentifier(operationId, 'Operation ID');
      const validated = validateReceipt(receipt);
      if (validated === undefined) throw new Error('Settlement receipt is invalid.');
      const result = await database.prepare(
        `UPDATE payment_operations
         SET state = 'settled', receipt_json = ?
         WHERE operation_id = ? AND state = 'settling'`,
      ).bind(JSON.stringify(validated), operationId).run();
      return changes(result) === 1;
    },

    async saveSettlementReceipt(operationId: string, receipt: SettlementReceipt): Promise<void> {
      assertIdentifier(operationId, 'Operation ID');
      const validated = validateReceipt(receipt);
      if (validated === undefined) throw new Error('Settlement receipt is invalid.');
      const result = await database.prepare(
        `UPDATE payment_operations
         SET receipt_json = ?
         WHERE operation_id = ? AND state = 'settled' AND receipt_json IS NULL`,
      ).bind(JSON.stringify(validated), operationId).run();
      if (changes(result) !== 1) {
        throw new Error('Settlement receipt can only be stored once for a settled operation.');
      }
    },

    async getSettlementReceipt(operationId: string): Promise<SettlementReceipt | undefined> {
      assertIdentifier(operationId, 'Operation ID');
      const row = await database.prepare(
        'SELECT state, receipt_json FROM payment_operations WHERE operation_id = ?',
      ).bind(operationId).first<ReceiptRow>();
      if (row === null || (row.state !== 'settled' && row.state !== 'fulfilled') || row.receipt_json === null) {
        return undefined;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(row.receipt_json);
      } catch {
        throw new Error('Stored settlement receipt is invalid.');
      }
      const receipt = validateReceipt(parsed);
      if (receipt === undefined) throw new Error('Stored settlement receipt is invalid.');
      return receipt;
    },
  });
}
