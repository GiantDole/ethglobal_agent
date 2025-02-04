import pino, { Logger, LoggerOptions } from 'pino';
import dotenv from 'dotenv';

dotenv.config();

/**
 * LOG_LEVEL can be set to 'fatal', 'error', 'warn', 'info', 'debug', or 'trace'.
 * Defaults to 'info' if not provided.
 */
const level: string = process.env.LOG_LEVEL || 'info';

// Use pretty transport for non-production environments
const usePrettyTransport: boolean = process.env.NODE_ENV !== 'production';

const options: LoggerOptions = {
  level,
  messageKey: 'msg',
  timestamp: false,
  formatters: {
    level: (label: string) => ({ level: label })
  },
  base: null,
  transport: usePrettyTransport
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    : undefined
};

const streams = pino.multistream(
  [
    {
      level: 'info',
      stream: process.stdout
    },
    {
      level: 'warn',
      stream: process.stderr
    }
  ],
  { dedupe: true }
);

const logger: Logger = pino(options, streams);

export default logger;
