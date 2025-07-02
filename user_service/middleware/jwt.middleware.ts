import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../services/users.service';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
    constructor(
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
    ) { }

    async use(req: Request, res: Response, next: NextFunction) {
        console.log("jwt middleware");
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid Authorization header');
        }

        const token = authHeader.split(' ')[1];

        try {
            const payload = await this.jwtService.verifyAsync(token);
            const user = await this.usersService.findById(payload.userId);

            if (!user) {
                throw new UnauthorizedException('User not found');
            }
            req['user'] = user;
            next();
        } catch (error) {
            console.error('JWT Middleware error:', error);
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
