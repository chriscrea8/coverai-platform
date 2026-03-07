import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import {
  appConfig, dbConfig, jwtConfig, redisConfig,
  awsConfig, paystackConfig, openaiConfig, emailConfig, twilioConfig,
} from './config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SmeModule } from './sme/sme.module';
import { InsuranceProvidersModule } from './insurance-providers/insurance-providers.module';
import { InsuranceProductsModule } from './insurance-products/insurance-products.module';
import { PoliciesModule } from './policies/policies.module';
import { PaymentsModule } from './payments/payments.module';
import { ClaimsModule } from './claims/claims.module';
import { CommissionsModule } from './commissions/commissions.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PartnersModule } from './partners/partners.module';
import { AdminModule } from './admin/admin.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, jwtConfig, redisConfig, awsConfig, paystackConfig, openaiConfig, emailConfig, twilioConfig],
    }),
    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('database.host'),
        port: cfg.get('database.port'),
        username: cfg.get('database.username'),
        password: cfg.get('database.password'),
        database: cfg.get('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: cfg.get('app.nodeEnv') === 'development',
        logging: cfg.get('app.nodeEnv') === 'development',
        ssl: cfg.get('app.nodeEnv') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    // Rate Limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ([{
        ttl: cfg.get('THROTTLE_TTL', 60),
        limit: cfg.get('THROTTLE_LIMIT', 100),
      }]),
    }),
    // Cron Jobs
    ScheduleModule.forRoot(),
    // Feature Modules
    AuthModule,
    UsersModule,
    SmeModule,
    InsuranceProvidersModule,
    InsuranceProductsModule,
    PoliciesModule,
    PaymentsModule,
    ClaimsModule,
    CommissionsModule,
    ChatModule,
    NotificationsModule,
    PartnersModule,
    AdminModule,
    FilesModule,
  ],
})
export class AppModule {}
