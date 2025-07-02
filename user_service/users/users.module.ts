// src/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from '../services/users.service';
import { UsersController } from './users.controller';
import { User } from '../entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { KafkaService } from '../kafka/kafka.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
    ],
    controllers: [UsersController],
    providers: [UsersService, KafkaService],
    exports: [UsersService],
})
export class UsersModule { }
