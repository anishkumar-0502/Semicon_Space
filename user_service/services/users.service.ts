import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { hashPassword } from '../utils/auth.utils';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async create(email: string, password: string, role?: string): Promise<User> {
        const hashedPassword = await hashPassword(password);
        const user = this.usersRepository.create({ email, password: hashedPassword, role });
        return this.usersRepository.save(user);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOneBy({ email });
    }

    async findById(id: number): Promise<User | null> {
        return this.usersRepository.findOneBy({ id });
    }
}