// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { UsersModule } from './users/users.module';
import { KafkaModule } from './kafka/kafka.module';
import { databaseConfig } from './config/database.config';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { JwtMiddleware } from './middleware/jwt.middleware';
import { GlobalJwtModule } from './utils/jwt.module';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(databaseConfig),
        GlobalJwtModule,
        UsersModule,
        KafkaModule,
    ],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // Apply request logger to all routes
        consumer
            .apply(RequestLoggerMiddleware)
            .forRoutes('*');

        // Apply JWT middleware, excluding login/register
        consumer
            .apply(JwtMiddleware)
            .exclude(
                { path: 'users/login', method: RequestMethod.POST },
                { path: 'users/register', method: RequestMethod.POST }
            )
            .forRoutes('*');
    }
}
