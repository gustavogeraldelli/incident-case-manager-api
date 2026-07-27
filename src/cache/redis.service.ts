import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.getOrThrow<string>('REDIS_HOST'),
      port: this.configService.getOrThrow<number>('REDIS_PORT'),
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: null,
    });

    this.client.on('error', (error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
  }

  async get(key: string) {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.warn(
        `Redis GET failed for key "${key}": ${this.message(error)}`,
      );
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number) {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(
        `Redis SET failed for key "${key}": ${this.message(error)}`,
      );
    }
  }

  async del(key: string) {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(
        `Redis DEL failed for key "${key}": ${this.message(error)}`,
      );
    }
  }

  onModuleDestroy() {
    this.client.removeAllListeners();
    this.client.disconnect();
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
