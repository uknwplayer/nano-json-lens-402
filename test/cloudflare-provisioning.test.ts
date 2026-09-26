import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finalizeD1DatabaseConfig } from '../scripts/cloudflare/d1-config.ts';

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const REAL_UUID = '12345678-1234-4abc-8def-1234567890ab';

function config(databaseId = ZERO_UUID, binding = 'PAYMENT_DB', databaseName = 'nano-json-lens-402-payment-state') {
  return `{
  // Preserve this provisioning comment.
  "name": "nano-json-lens-402",
  "d1_databases": [
    {
      "binding": "${binding}",
      "database_name": "${databaseName}",
      "database_id": "${databaseId}",
      "migrations_dir": "migrations"
    }
  ]
}\n`;
}

test('replaces only the expected zero D1 placeholder and preserves JSONC comments', () => {
  const result = finalizeD1DatabaseConfig(config(), REAL_UUID);
  assert.match(result, /Preserve this provisioning comment/);
  assert.match(result, new RegExp(REAL_UUID));
  assert.doesNotMatch(result, new RegExp(ZERO_UUID));
});

test('is idempotent when the intended real D1 id is already committed', () => {
  const original = config(REAL_UUID);
  assert.equal(finalizeD1DatabaseConfig(original, REAL_UUID), original);
});

test('refuses to rebind an already-real database id to another database', () => {
  const other = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  assert.throws(() => finalizeD1DatabaseConfig(config(REAL_UUID), other), /refuse|already|rebind/i);
});

test('fails closed for an unexpected binding, database name, or invalid uuid', () => {
  assert.throws(() => finalizeD1DatabaseConfig(config(ZERO_UUID, 'OTHER_DB'), REAL_UUID), /binding|database/i);
  assert.throws(() => finalizeD1DatabaseConfig(config(ZERO_UUID, 'PAYMENT_DB', 'other-name'), REAL_UUID), /binding|database/i);
  assert.throws(() => finalizeD1DatabaseConfig(config(), 'not-a-uuid'), /uuid/i);
});
