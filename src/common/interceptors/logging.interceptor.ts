import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method: string; path: string }>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          process.stdout.write(
            JSON.stringify({
              level: 'info',
              timestamp: new Date().toISOString(),
              method: req.method,
              path: req.path,
              durationMs: Date.now() - start,
            }) + '\n',
          );
        },
        error: () => {
          process.stderr.write(
            JSON.stringify({
              level: 'warn',
              timestamp: new Date().toISOString(),
              method: req.method,
              path: req.path,
              durationMs: Date.now() - start,
            }) + '\n',
          );
        },
      }),
    );
  }
}
