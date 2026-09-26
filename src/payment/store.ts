import type { SettlementReceipt } from '../server.ts';
import type { PaymentState } from './state.ts';

export type PaymentClaimResult =
  | { status: 'claimed' }
  | { status: 'existing'; operationId: string }
  | { status: 'conflict' };

export interface PaymentStateStore {
  readonly productionSafe: boolean;

  claimPayment(
    paymentIdentity: string,
    requestId: string,
    operationId: string,
  ): Promise<PaymentClaimResult>;

  getState(operationId: string): Promise<PaymentState | undefined>;

  compareAndSetState(
    operationId: string,
    expected: PaymentState,
    next: PaymentState,
  ): Promise<boolean>;

  /** Atomically persist the confirmed receipt while transitioning settling -> settled. */
  confirmSettlement(operationId: string, receipt: SettlementReceipt): Promise<boolean>;

  /** Legacy/local helper; production settlement flow uses confirmSettlement instead. */
  saveSettlementReceipt(operationId: string, receipt: SettlementReceipt): Promise<void>;
  getSettlementReceipt(operationId: string): Promise<SettlementReceipt | undefined>;
}
