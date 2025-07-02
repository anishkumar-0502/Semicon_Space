import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { JwtService } from '@nestjs/jwt';
import { comparePassword, generateToken } from '../utils/auth.utils';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { KafkaService } from '../kafka/kafka.service'; // Ensure correct path

@Controller('users')
export class UsersController {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private kafkaService: KafkaService, // Inject KafkaService
    ) { }

    @Post('register')
    async register(@Body() body: { email: string; password: string; role?: string }) {
        const existingUser = await this.usersService.findByEmail(body.email);
        if (existingUser) {
            throw new HttpException('Email already exists', HttpStatus.CONFLICT);
        }
        const user = await this.usersService.create(body.email, body.password, body.role);
        const token = await generateToken(this.jwtService, { userId: user.id, email: user.email, role: user.role });

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
        } catch (error) {
            console.error('Failed to send registration event to Kafka:', error);
            // Optionally throw or log a warning to the client if Kafka is critical
        }
        return { access_token: token, user: { id: user.id, email: user.email, role: user.role } };
    }
    @Post('login')
    async login(@Body() body: { email: string; password: string }) {
        const user = await this.usersService.findByEmail(body.email);
        if (!user || !(await comparePassword(body.password, user.password))) {
            throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
        }
        const token = await generateToken(this.jwtService, { userId: user.id, email: user.email, role: user.role });

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

    @UseGuards(JwtAuthGuard)
    @Post('profile')
    async profile(@Body() body: { email: string }) {
        const user = await this.usersService.findByEmail(body.email);
        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }
        return { id: user.id, email: user.email, role: user.role };
    }
}