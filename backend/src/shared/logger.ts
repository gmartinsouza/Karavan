import type { FastifyServerOptions } from 'fastify';
import type { Config } from '../config.js';

export function loggerOptions(config: Config): NonNullable<FastifyServerOptions['logger']> {
  if (config.env === 'test') {
    return false;
  }
  if (config.env === 'development') {
    return {
      level: config.logLevel,
      transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } },
    };
  }
  return { level: config.logLevel };
}
