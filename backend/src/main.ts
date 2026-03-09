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
    logger: ['error', 'warn', 'log'],
    bufferLogs: true,
  });

  const cfg = app.get(ConfigService);
  const port = parseInt(process.env.PORT || '3000', 10);
  const frontendUrl = process.env.FRONTEND_URL || 'https://coverai-platform.vercel.app';

  // Security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.paystack.co'],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  }));
  app.use(compression());

  // CORS - allow frontend and all during development
  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:3001',
      'https://coverai-platform.vercel.app',
      /\.vercel\.app$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CoverAI API')
    .setDescription('InsurTech Platform REST API — Nigeria & Africa')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addTag('Health').addTag('Auth').addTag('Users').addTag('SME')
    .addTag('Insurance Products').addTag('Policies')
    .addTag('Payments').addTag('Claims').addTag('Chat').addTag('Admin')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Listen on all interfaces (required for Railway)
  await app.listen(port, '0.0.0.0');

  logger.log(`✅ CoverAI API is running on port ${port}`);
  logger.log(`📖 Swagger: http://localhost:${port}/api/docs`);
  logger.log(`❤️  Health:  http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((err) => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});
