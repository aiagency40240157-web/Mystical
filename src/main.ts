import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

const FORBIDDEN_JWT_SECRETS = new Set([
  'changeme-set-JWT_SECRET-in-env',
  'changeme',
  'secret',
  'jwt_secret',
  '',
]);

async function bootstrap() {
  const jwtSecret = process.env.JWT_SECRET ?? '';
  if (!jwtSecret || FORBIDDEN_JWT_SECRETS.has(jwtSecret) || jwtSecret.length < 32) {
    process.stderr.write(
      'FATAL: JWT_SECRET is missing, too short (< 32 chars), or uses the default placeholder. Set a strong secret and restart.\n',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3001,http://127.0.0.1:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  process.stdout.write(
    JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), msg: 'Application started', port }) + '\n',
  );
}

bootstrap();
