import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// @Catch() with no arguments catches EVERYTHING — HttpExceptions and unexpected errors
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  // NestJS built-in logger — better than console.log
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // If it's a known NestJS HTTP exception (NotFoundException, ForbiddenException etc.)
    // use its status code. Otherwise it's an unexpected crash → 500
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract the message cleanly from HttpException, or use a generic message
    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message || exception.message
        : 'Internal server error';

    const errorResponse = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    };

    // Log the error on the server side — critical for debugging
    this.logger.error(
      `${request.method} ${request.url} → ${statusCode}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(statusCode).json(errorResponse);
  }
}