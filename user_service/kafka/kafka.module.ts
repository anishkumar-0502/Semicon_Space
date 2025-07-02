// src/kafka/kafka.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { UsersModule } from '../users/users.module'; // ✅ Correct path
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        forwardRef(() => UsersModule), // ✅ fix circular dependency
        JwtModule.register({
            secret: process.env.JWT_SECRET || '62e3e92d827f00b404c92698070d0a0e2e19f0d7c6c93cdfb50c5e12a40b5c416e76ea027bf7fd00331db0c50fe4ce6843862d3acd354c374263eacab68fa309',
            signOptions: { expiresIn: '1h' }
        }),
    ],
    providers: [KafkaService],
    exports: [KafkaService],
})
export class KafkaModule { }
