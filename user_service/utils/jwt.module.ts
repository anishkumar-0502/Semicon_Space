import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Global() // 👈 Makes the module and its providers available app-wide
@Module({
    imports: [JwtModule.register({
        secret: process.env.JWT_SECRET || '62e3e92d827f00b404c92698070d0a0e2e19f0d7c6c93cdfb50c5e12a40b5c416e76ea027bf7fd00331db0c50fe4ce6843862d3acd354c374263eacab68fa309',
    })],
    exports: [JwtModule], // 👈 Export so other modules can use JwtService
})
export class GlobalJwtModule { }
