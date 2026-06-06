import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({ origin: ['http://localhost:3001', 'http://127.0.0.1:3001'], credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  process.stdout.write(
    JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), msg: 'Application started', port }) + '\n',
  );
}

bootstrap();
