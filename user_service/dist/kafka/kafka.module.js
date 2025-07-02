"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaModule = void 0;
// src/kafka/kafka.module.ts
const common_1 = require("@nestjs/common");
const kafka_service_1 = require("./kafka.service");
const users_module_1 = require("../users/users.module"); // ✅ Correct path
const jwt_1 = require("@nestjs/jwt");
let KafkaModule = class KafkaModule {
};
exports.KafkaModule = KafkaModule;
exports.KafkaModule = KafkaModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => users_module_1.UsersModule), // ✅ fix circular dependency
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET || '62e3e92d827f00b404c92698070d0a0e2e19f0d7c6c93cdfb50c5e12a40b5c416e76ea027bf7fd00331db0c50fe4ce6843862d3acd354c374263eacab68fa309',
                signOptions: { expiresIn: '1h' }
            }),
        ],
        providers: [kafka_service_1.KafkaService],
        exports: [kafka_service_1.KafkaService],
    })
], KafkaModule);
