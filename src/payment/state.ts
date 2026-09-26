export type PaymentState =
  | 'unverified'
  | 'verified'
  | 'settling'
  | 'settlement_unknown'
  | 'settled'
  | 'fulfilled';

export interface TransitionEvidence {
  readonly reconciledNotSettled?: boolean;
}

const normalTransitions: Readonly<Record<PaymentState, ReadonlySet<PaymentState>>> = {
  unverified: new Set(['verified']),
  verified: new Set(['settling']),
  settling: new Set(['settled', 'settlement_unknown']),
  settlement_unknown: new Set(['settled']),
  settled: new Set(['settled', 'fulfilled']),
  fulfilled: new Set(['fulfilled']),
};

/**
 * Enforce the payment lifecycle. An unknown settlement may be retried only
 * after authoritative reconciliation proves that the prior settlement did not occur.
 */
export function transitionPaymentState(
  current: PaymentState,
  next: PaymentState,
  evidence: TransitionEvidence = {},
): PaymentState {
  if (current === 'settlement_unknown' && next === 'verified') {
    if (evidence.reconciledNotSettled === true) return next;
    throw new Error('Settlement must be reconciled before retry.');
  }
  if (!normalTransitions[current].has(next)) {
    throw new Error(`Invalid payment state transition: ${current} -> ${next}`);
  }
  return next;
}
