/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Forzamos a Prisma a usar la URL del proceso actual
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    try {
      console.log('⏳ Intentando conectar a la base de datos de Render...');
      await this.$connect();
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Error al conectar a la DB:', error.message);
      // No lanzamos el throw para permitir que el servidor suba y ver Swagger
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper para soft delete
  softDelete(model: any, id: string) {
    return model.update({
      where: { id },
      data: { activo: false },
    });
  }

  // Helper para cleanup en tests
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase solo puede usarse en tests');
    }

    const models = [
      'solicitudAuxilio',
      'vehiculo',
      'empresa',
      'proveedor',
      'usuario',
      'refreshToken',
      'plan',
    ];

    for (const model of models) {
      await this[model].deleteMany();
    }
  }
}
