"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
// src/app.module.ts
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const users_module_1 = require("./users/users.module");
const kafka_module_1 = require("./kafka/kafka.module");
const database_config_1 = require("./config/database.config");
const logging_interceptor_1 = require("./interceptors/logging.interceptor");
const jwt_middleware_1 = require("./middleware/jwt.middleware");
const jwt_module_1 = require("./utils/jwt.module");
const request_logger_middleware_1 = require("./middleware/request-logger.middleware");
let AppModule = class AppModule {
    configure(consumer) {
        // Apply request logger to all routes
        consumer
            .apply(request_logger_middleware_1.RequestLoggerMiddleware)
            .forRoutes('*');
        // Apply JWT middleware, excluding login/register
        consumer
            .apply(jwt_middleware_1.JwtMiddleware)
            .exclude({ path: 'users/login', method: common_1.RequestMethod.POST }, { path: 'users/register', method: common_1.RequestMethod.POST })
            .forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRoot(database_config_1.databaseConfig),
            jwt_module_1.GlobalJwtModule,
            users_module_1.UsersModule,
            kafka_module_1.KafkaModule,
        ],
        providers: [
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: logging_interceptor_1.LoggingInterceptor,
            },
        ],
    })
], AppModule);
