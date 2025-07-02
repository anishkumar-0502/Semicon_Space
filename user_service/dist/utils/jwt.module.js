"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalJwtModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
let GlobalJwtModule = class GlobalJwtModule {
};
exports.GlobalJwtModule = GlobalJwtModule;
exports.GlobalJwtModule = GlobalJwtModule = __decorate([
    (0, common_1.Global)() // 👈 Makes the module and its providers available app-wide
    ,
    (0, common_1.Module)({
        imports: [jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET || '62e3e92d827f00b404c92698070d0a0e2e19f0d7c6c93cdfb50c5e12a40b5c416e76ea027bf7fd00331db0c50fe4ce6843862d3acd354c374263eacab68fa309',
            })],
        exports: [jwt_1.JwtModule], // 👈 Export so other modules can use JwtService
    })
], GlobalJwtModule);
