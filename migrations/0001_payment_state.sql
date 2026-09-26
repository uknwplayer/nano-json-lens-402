CREATE TABLE IF NOT EXISTS payment_operations (
  payment_identity TEXT PRIMARY KEY NOT NULL CHECK(length(payment_identity) = 64),
  request_id TEXT NOT NULL CHECK(length(request_id) = 64),
  operation_id TEXT NOT NULL UNIQUE CHECK(length(operation_id) = 64),
  state TEXT NOT NULL CHECK(state IN (
    'unverified',
    'verified',
    'settling',
    'settlement_unknown',
    'settled',
    'fulfilled'
  )),
  receipt_json TEXT,
  CHECK(receipt_json IS NULL OR state IN ('settled', 'fulfilled'))
);
