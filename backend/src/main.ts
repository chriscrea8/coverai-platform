import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const cfg = app.get(ConfigService);
  const port = cfg.get<number>('app.port', 3000);
  const nodeEnv = cfg.get<string>('app.nodeEnv');

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: [cfg.get('app.frontendUrl'), 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger (non-production)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CoverAI API')
      .setDescription('InsurTech Platform REST API — Nigeria & Africa')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'ApiKey')
      .addTag('Auth', 'Authentication & Authorization')
      .addTag('Users', 'User Profile Management')
      .addTag('SME', 'SME Business Profiles')
      .addTag('Insurance Products', 'Product Catalog')
      .addTag('Policies', 'Policy Purchase & Management')
      .addTag('Payments', 'Payment Processing')
      .addTag('Claims', 'Claims Submission & Tracking')
      .addTag('Chat', 'AI Insurance Assistant')
      .addTag('Partner API', 'Embedded Insurance API')
      .addTag('Admin', 'Admin Back Office')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  logger.log(`CoverAI API running on port ${port} [${nodeEnv}]`);
}

bootstrap();
