import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global filters, pipes, interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());

  // ─── Swagger Setup ──────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Task Manager API')
    .setDescription('NestJS + PostgreSQL POC')
    .setVersion('1.0')
    .addBearerAuth() // adds the Authorization header input in the UI
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Mounts the Swagger UI at /api
  SwaggerModule.setup('api', app, document);
  // ────────────────────────────────────────────────────────────────────────────

  await app.listen(3000);
}
bootstrap();