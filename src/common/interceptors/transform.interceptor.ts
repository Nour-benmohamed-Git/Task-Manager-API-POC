import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// The shape of every successful response
export interface Response<T> {
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,  // gives access to request/response objects
    next: CallHandler,          // represents the route handler itself
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();

    return next
      .handle()  // calls the actual route handler
      .pipe(
        // map() runs on the value the handler returns
        // and transforms it into our unified shape
        map((data) => ({
          data,
          timestamp: new Date().toISOString(),
        })),
      );
  }
}