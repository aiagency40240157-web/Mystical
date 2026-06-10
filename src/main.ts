import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3001,http://127.0.0.1:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  process.stdout.write(
    JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), msg: 'Application started', port }) + '\n',
  );
}

bootstrap();
