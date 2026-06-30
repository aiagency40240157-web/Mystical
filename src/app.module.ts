import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { ClientsModule } from './modules/clients/clients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { PaymentModule } from './modules/payments/payment.module';
import { AiCommunicationModule } from './modules/ai-communication/ai-communication.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { RetentionModule } from './modules/retention/retention.module';
import { AuthModule } from './modules/auth/auth.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RelationshipsModule } from './modules/relationships/relationships.module';
import { InstagramModule } from './modules/instagram/instagram.module';
import { ServicesModule } from './modules/services/services.module';
import { FinancialModule } from './modules/financial/financial.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    ScheduleModule.forRoot(),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'changeme-set-JWT_SECRET-in-env',
      signOptions: { expiresIn: '8h' },
    }),
    DatabaseModule,
    AuthModule,
    ClientsModule,
    AppointmentsModule,
    PaymentModule,
    AiCommunicationModule,
    AnalyticsModule,
    RelationshipsModule,
    WhatsAppModule,
    SchedulerModule,
    RetentionModule,
    InstagramModule,
    ServicesModule,
    FinancialModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
