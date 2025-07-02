import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';
import * as os from 'os';

async function bootstrap() {
    dotenv.config();

    const app = await NestFactory.create(AppModule);

    const port = parseInt(process.env.PORT || '8000', 10);
    await app.listen(port);

    const interfaces = os.networkInterfaces();
    const urls: string[] = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]!) {
            if (iface.family === 'IPv4' && !iface.internal) {
                urls.push(`http://${iface.address}:${port}`);
            }
        }
    }


    urls.forEach((url) => Logger.log(`→ ${url}`, 'Bootstrap'));
}
bootstrap();
