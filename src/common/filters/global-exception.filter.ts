import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    process.stderr.write(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        method: request.method,
        path: request.path,
        statusCode: status,
      }) + '\n',
    );

    response.status(status).json({ error: 'Unable to process request at this time' });
  }
}
