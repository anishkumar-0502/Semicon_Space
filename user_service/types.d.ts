import { User } from './entities/user.entity';

declare module 'express' {
    interface Request {
        user?: User;
    }
}