import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    const errorResponse =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : (exceptionResponse as any);

    const errorPayload = {
      statusCode: status,
      message: errorResponse.message || exception.message,
      ...(errorResponse.errors && { errors: errorResponse.errors }), // Para errores de validación
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Solo logea el error sin el stack completo
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${JSON.stringify(errorResponse.message || exception.message)}`,
    );

    response.status(status).json(errorPayload);
  }
}
