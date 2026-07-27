import { config } from 'dotenv';

export function loadE2eEnv() {
  config({ quiet: true });

  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL must be set before running e2e tests');
  }

  process.env.DATABASE_URL = testDatabaseUrl;

  return testDatabaseUrl;
}
