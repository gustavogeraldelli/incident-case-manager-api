import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
import { loadE2eEnv } from './e2e-env';

export default async function globalSetup() {
  const testDatabaseUrl = loadE2eEnv();

  await createDatabaseIfMissing(testDatabaseUrl);

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
  });
}

async function createDatabaseIfMissing(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!databaseName) {
    throw new Error('TEST_DATABASE_URL must include a database name');
  }

  const maintenanceUrl = new URL(databaseUrl);
  maintenanceUrl.pathname = '/postgres';
  maintenanceUrl.search = '';

  const client = new Client({
    connectionString: maintenanceUrl.toString(),
  });

  await client.connect();

  try {
    const existingDatabase = await client.query<{ exists: boolean }>(
      'select exists(select 1 from pg_database where datname = $1) as "exists"',
      [databaseName],
    );

    if (!existingDatabase.rows[0]?.exists) {
      await client.query(`create database ${quoteIdentifier(databaseName)}`);
    }
  } finally {
    await client.end();
  }
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}
