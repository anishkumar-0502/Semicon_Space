"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../services/users.service");
const jwt_1 = require("@nestjs/jwt");
const auth_utils_1 = require("../utils/auth.utils");
const jwt_guard_1 = require("../guards/jwt.guard");
const kafka_service_1 = require("../kafka/kafka.service"); // Ensure correct path
let UsersController = class UsersController {
    constructor(usersService, jwtService, kafkaService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.kafkaService = kafkaService;
    }
    async register(body) {
        const existingUser = await this.usersService.findByEmail(body.email);
        if (existingUser) {
            throw new common_1.HttpException('Email already exists', common_1.HttpStatus.CONFLICT);
        }
        const user = await this.usersService.create(body.email, body.password, body.role);
        const token = await (0, auth_utils_1.generateToken)(this.jwtService, { userId: user.id, email: user.email, role: user.role });
        // Produce Kafka message after successful registration
        const registerMessage = {
            action: 'register',
            userId: user.id,
            email: user.email,
            role: user.role,
            time: new Date().toISOString(),
        };
        try {
            await this.kafkaService.sendMessage('user.loggedin', [{ value: JSON.stringify(registerMessage) }]);
            console.log('Registration event sent to Kafka topic user.loggedin:', registerMessage);
        }
        catch (error) {
            console.error('Failed to send registration event to Kafka:', error);
            // Optionally throw or log a warning to the client if Kafka is critical
        }
        return { access_token: token, user: { id: user.id, email: user.email, role: user.role } };
    }
    async login(body) {
        const user = await this.usersService.findByEmail(body.email);
        if (!user || !(await (0, auth_utils_1.comparePassword)(body.password, user.password))) {
            throw new common_1.HttpException('Invalid credentials', common_1.HttpStatus.UNAUTHORIZED);
        }
        const token = await (0, auth_utils_1.generateToken)(this.jwtService, { userId: user.id, email: user.email, role: user.role });
        // // Produce Kafka message after successful login using the public method
        // const loginMessage = {
        //     action: 'login',
        //     userId: user.id,
        //     email: user.email,
        //     role: user.role,
        //     time: new Date().toISOString(),
        // };
        // try {
        //     await this.kafkaService.sendMessage('user.loggedin', [{ value: JSON.stringify(loginMessage) }]);
        //     console.log('Login event sent to Kafka topic user.loggedin:', loginMessage);
        // } catch (error) {
        //     console.error('Failed to send login event to Kafka:', error);
        // }
        return { access_token: token, user: { id: user.id, email: user.email, role: user.role } };
    }
    async profile(body) {
        const user = await this.usersService.findByEmail(body.email);
        if (!user) {
            throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
        }
        return { id: user.id, email: user.email, role: user.role };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "login", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('profile'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "profile", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        kafka_service_1.KafkaService])
], UsersController);
