import type { PaymentState } from './state.ts';
import type { PaymentClaimResult, PaymentStateStore } from './store.ts';

interface PaymentBinding {
  requestId: string;
  operationId: string;
}

interface OperationRecord {
  state: PaymentState;
}

/**
 * Process-local test/development implementation only.
 *
 * It deliberately advertises `productionSafe = false`: state disappears on
 * restart/deploy and therefore cannot provide production replay protection.
 */
export class MemoryPaymentStateStore implements PaymentStateStore {
  readonly productionSafe = false;

  private readonly payments = new Map<string, PaymentBinding>();
  private readonly operations = new Map<string, OperationRecord>();

  async claimPayment(
    paymentIdentity: string,
    requestId: string,
    operationId: string,
  ): Promise<PaymentClaimResult> {
    const existing = this.payments.get(paymentIdentity);
    if (existing !== undefined) {
      if (existing.requestId !== requestId) {
        return { status: 'conflict' };
      }
      return { status: 'existing', operationId: existing.operationId };
    }

    this.payments.set(paymentIdentity, { requestId, operationId });
    this.operations.set(operationId, { state: 'unverified' });
    return { status: 'claimed' };
  }

  async getState(operationId: string): Promise<PaymentState | undefined> {
    return this.operations.get(operationId)?.state;
  }

  async compareAndSetState(
    operationId: string,
    expected: PaymentState,
    next: PaymentState,
  ): Promise<boolean> {
    const record = this.operations.get(operationId);
    if (record === undefined || record.state !== expected) {
      return false;
    }

    record.state = next;
    return true;
  }
}
