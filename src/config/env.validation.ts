import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('1h'),
  PORT: z.coerce.number().default(3000),
});

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
