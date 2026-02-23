/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Security
    app.use(helmet());
    // app.use(compression());

    // CORS
    app.enableCors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
      credentials: true,
    });

    // Global prefix
    app.setGlobalPrefix('api');

    // Validation pipe global
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Remueve propiedades no definidas en DTO
        forbidNonWhitelisted: true, // Lanza error si hay props no permitidas
        transform: true, // Transforma tipos automáticamente
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Auxy CRM API')
      .setDescription('API de gestión de asistencia vehicular')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', 'Endpoints de autenticación')
      .addTag('Usuarios', 'Gestión de usuarios')
      .addTag('Clientes', 'Gestion de clientes')
      .addTag('Vehículos', 'Gestión de vehículos')
      .addTag('Proveedores', 'Gestión de proveedores')
      .addTag('Solicitudes', 'Gestión de solicitudes de auxilio')
      .addTag('Planes', 'Gestión de planes')
      .addTag('Vehículos Proveedor', 'Gestión de vehículos de asistencia')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3001;
    await app.listen(port);

    console.log(`🚀 Server running on: http://localhost:${port}/api`);
    console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
}

bootstrap();

