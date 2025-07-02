import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

export async function generateToken(jwtService: JwtService, payload: { userId: number; email: string; role?: string }): Promise<string> {
    return jwtService.sign(payload);
}