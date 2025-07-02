"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfig = void 0;
exports.databaseConfig = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '887020',
    database: process.env.DB_NAME || 'user_db',
    entities: [__dirname + '/../**/*.entity.ts'],
    synchronize: true,
};
// import { TypeOrmModuleOptions } from '@nestjs/typeorm';
// export const databaseConfig: TypeOrmModuleOptions = {
//     type: 'postgres',
//     url: process.env.RAILWAY_URL || 'postgresql://postgres:WvtHfzcOnqSJUYdAuYKdnKcouDnGbvNB@shortline.proxy.rlwy.net:26723/railway',
//     entities: [__dirname + '/../**/*.entity.ts'],
//     synchronize: true,
//     ssl: { rejectUnauthorized: false },
//     logging: true,
// };
