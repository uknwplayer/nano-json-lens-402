import { DatabaseSync } from 'node:sqlite';
import type {
  PaymentClaim,
  PaymentRecord,
  PaymentState,
  PaymentStateStore,
} from './payment.ts';
import type { SettlementReceipt } from './server.ts';

const STATES = new Set<PaymentState>(['settling', 'settlement_unknown', 'settled', 'settle_failed']);
const HEX_64 = /^[0-9a-f]{64}$/i;

type PaymentRow = {
  payment_identity: string;
  request_id: string;
  operation_id: string;
  state: string;
  receipt_json: string | null;
};

type Statement = ReturnType<DatabaseSync['prepare']>;

function assertIdentity(name: string, value: string): void {
  if (!HEX_64.test(value)) throw new Error(`${name} must be a 256-bit hexadecimal identifier.`);
}

function validReceipt(value: unknown): value is SettlementReceipt {
  if (!value || typeof value !== 'object') return false;
  const receipt = value as Partial<SettlementReceipt>;
  return receipt.success === true && receipt.network === 'nano:mainnet' &&
    typeof receipt.transaction === 'string' && HEX_64.test(receipt.transaction) &&
    (receipt.payer === undefined || typeof receipt.payer === 'string');
}

function rowToRecord(row: PaymentRow): PaymentRecord {
  if (!STATES.has(row.state as PaymentState)) throw new Error('Payment store contains an invalid state.');
  const receipt = row.receipt_json === null ? undefined : JSON.parse(row.receipt_json) as unknown;
  if (receipt !== undefined && !validReceipt(receipt)) throw new Error('Payment store contains an invalid receipt.');
  if (row.state === 'settled' && receipt === undefined) throw new Error('Settled payment is missing its receipt.');
  return {
    paymentIdentity: row.payment_identity,
    requestId: row.request_id,
    operationId: row.operation_id,
    state: row.state as PaymentState,
    ...(receipt ? { receipt } : {}),
  };
}

export class SqlitePaymentStateStore implements PaymentStateStore {
  readonly #db: DatabaseSync;
  readonly #insert: Statement;
  readonly #update: Statement;
  readonly #selectPayment: Statement;
  readonly #selectOperation: Statement;
  #closed = false;

  constructor(path: string) {
    if (typeof path !== 'string' || path.length === 0) throw new Error('Payment database path is required.');
    this.#db = new DatabaseSync(path, { timeout: 5_000 });
    this.#db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS payment_state (
        payment_identity TEXT PRIMARY KEY NOT NULL,
        request_id TEXT NOT NULL,
        operation_id TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL CHECK (state IN ('settling', 'settlement_unknown', 'settled', 'settle_failed')),
        receipt_json TEXT,
        updated_at_ms INTEGER NOT NULL
      ) STRICT;
    `);
    this.#insert = this.#db.prepare(`
      INSERT OR IGNORE INTO payment_state
        (payment_identity, request_id, operation_id, state, receipt_json, updated_at_ms)
      VALUES (?, ?, ?, 'settling', NULL, ?)
    `);
    this.#update = this.#db.prepare(`
      UPDATE payment_state
      SET state = ?, receipt_json = ?, updated_at_ms = ?
      WHERE operation_id = ?
    `);
    this.#selectPayment = this.#db.prepare(`
      SELECT payment_identity, request_id, operation_id, state, receipt_json
      FROM payment_state WHERE payment_identity = ?
    `);
    this.#selectOperation = this.#db.prepare(`
      SELECT payment_identity, request_id, operation_id, state, receipt_json
      FROM payment_state WHERE operation_id = ?
    `);
  }

  async claim(record: PaymentRecord): Promise<PaymentClaim> {
    this.#assertOpen();
    assertIdentity('paymentIdentity', record.paymentIdentity);
    assertIdentity('requestId', record.requestId);
    assertIdentity('operationId', record.operationId);
    if (record.state !== 'settling' || record.receipt !== undefined) {
      throw new Error('New payment claims must begin in settling state without a receipt.');
    }

    const result = this.#insert.run(
      record.paymentIdentity.toLowerCase(),
      record.requestId.toLowerCase(),
      record.operationId.toLowerCase(),
      Date.now(),
    );
    const stored = this.#getByPaymentIdentity(record.paymentIdentity);
    if (!stored) throw new Error('Payment claim could not be persisted consistently.');
    if (Number(result.changes) === 1) return { kind: 'new', record: stored };
    if (stored.requestId !== record.requestId.toLowerCase()) return { kind: 'conflict', record: stored };
    return { kind: 'existing', record: stored };
  }

  async update(operationId: string, patch: Partial<PaymentRecord>): Promise<PaymentRecord> {
    this.#assertOpen();
    assertIdentity('operationId', operationId);
    if (patch.paymentIdentity !== undefined || patch.requestId !== undefined || patch.operationId !== undefined) {
      throw new Error('Payment identity fields are immutable.');
    }

    const current = this.#getByOperationId(operationId);
    if (!current) throw new Error('Payment operation does not exist.');
    const state = patch.state ?? current.state;
    if (!STATES.has(state)) throw new Error('Invalid payment state.');
    const receipt = patch.receipt ?? current.receipt;
    if (state === 'settled' && !validReceipt(receipt)) throw new Error('Settled state requires a valid receipt.');
    if (state !== 'settled' && receipt !== undefined) throw new Error('Only settled state may retain a receipt.');

    const result = this.#update.run(
      state,
      receipt === undefined ? null : JSON.stringify(receipt),
      Date.now(),
      operationId.toLowerCase(),
    );
    if (Number(result.changes) !== 1) throw new Error('Payment operation update was not durable.');

    const updated = this.#getByOperationId(operationId);
    if (!updated) throw new Error('Payment operation disappeared after update.');
    return updated;
  }

  close(): void {
    if (this.#closed) return;
    this.#db.close();
    this.#closed = true;
  }

  #getByPaymentIdentity(paymentIdentity: string): PaymentRecord | undefined {
    const row = this.#selectPayment.get(paymentIdentity.toLowerCase()) as PaymentRow | undefined;
    return row ? rowToRecord(row) : undefined;
  }

  #getByOperationId(operationId: string): PaymentRecord | undefined {
    const row = this.#selectOperation.get(operationId.toLowerCase()) as PaymentRow | undefined;
    return row ? rowToRecord(row) : undefined;
  }

  #assertOpen(): void {
    if (this.#closed) throw new Error('Payment store is closed.');
  }
}
