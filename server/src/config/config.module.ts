import { Global, Module } from '@nestjs/common';
import { ENV, Env, loadEnvOrExit } from './env';

/**
 * Parses the environment once, at module construction, and shares the result.
 * Global so no feature module has to remember to import it.
 */
@Global()
@Module({
  providers: [
    {
      provide: ENV,
      useFactory: (): Env => Object.freeze(loadEnvOrExit()),
    },
  ],
  exports: [ENV],
})
export class ConfigModule {}
