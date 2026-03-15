import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import {
  appConfig, dbConfig, jwtConfig, redisConfig,
  awsConfig, paystackConfig, openaiConfig, resendConfig, twilioConfig,
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
import { HealthModule } from './health/health.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { DatabaseModule } from './database/database.module';
import { LeadsModule } from './leads/leads.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, jwtConfig, redisConfig, awsConfig, paystackConfig, openaiConfig, resendConfig, twilioConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: false,
            logging: false,
            retryAttempts: 5,
            retryDelay: 3000,
            ssl: { rejectUnauthorized: false },
            extra: { ssl: { rejectUnauthorized: false } },
          };
        }
        return {
          type: 'postgres',
          host: cfg.get('database.host'),
          port: cfg.get<number>('database.port'),
          username: cfg.get('database.username'),
          password: cfg.get('database.password'),
          database: cfg.get('database.name'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: false,
          retryAttempts: 5,
          retryDelay: 3000,
          ssl: { rejectUnauthorized: false },
          extra: { ssl: { rejectUnauthorized: false } },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => ([{ ttl: 60000, limit: 100 }]),
    }),
    ScheduleModule.forRoot(),
    HealthModule,
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
    RecommendationsModule,
    DatabaseModule,
    LeadsModule,
    WhatsAppModule,
  ],
})
export class AppModule {}
