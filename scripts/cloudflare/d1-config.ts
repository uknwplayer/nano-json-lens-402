import { applyEdits, modify, parse, type ParseError } from 'jsonc-parser';

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const EXPECTED_BINDING = 'PAYMENT_DB';
const EXPECTED_DATABASE = 'nano-json-lens-402-payment-state';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface WranglerD1Binding {
  binding?: unknown;
  database_name?: unknown;
  database_id?: unknown;
}

interface WranglerConfig {
  d1_databases?: unknown;
}

function parseConfig(configText: string): WranglerConfig {
  const errors: ParseError[] = [];
  const parsed = parse(configText, errors, { allowTrailingComma: true, disallowComments: false }) as unknown;
  if (errors.length > 0 || parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Wrangler JSONC is invalid.');
  }
  return parsed as WranglerConfig;
}

export function finalizeD1DatabaseConfig(configText: string, databaseId: string): string {
  if (!UUID.test(databaseId) || databaseId === ZERO_UUID) {
    throw new Error('A non-placeholder D1 UUID is required.');
  }

  const parsed = parseConfig(configText);
  if (!Array.isArray(parsed.d1_databases)) {
    throw new Error('Expected D1 binding configuration is missing.');
  }

  const matches = parsed.d1_databases
    .map((value, index) => ({ value: value as WranglerD1Binding, index }))
    .filter(({ value }) => value.binding === EXPECTED_BINDING && value.database_name === EXPECTED_DATABASE);

  if (matches.length !== 1) {
    throw new Error('Expected D1 binding/database pair was not found exactly once.');
  }

  const { value, index } = matches[0];
  if (typeof value.database_id !== 'string') {
    throw new Error('Expected D1 database_id is missing.');
  }
  if (value.database_id === databaseId) return configText;
  if (value.database_id !== ZERO_UUID) {
    throw new Error('Refusing to rebind an already-provisioned D1 database id.');
  }

  const edits = modify(
    configText,
    ['d1_databases', index, 'database_id'],
    databaseId,
    { formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' } },
  );
  return applyEdits(configText, edits);
}
