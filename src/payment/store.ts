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
}
