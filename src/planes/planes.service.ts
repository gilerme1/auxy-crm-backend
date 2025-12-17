/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlanesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: dto,
    });
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true, deletedAt: null };

    return this.prisma.plan.findMany({
      where,
      include: {
        _count: {
          select: { empresas: true },
        },
      },
      orderBy: { precioMensual: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        empresas: {
          select: {
            id: true,
            razonSocial: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }

    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    const plan = await this.findOne(id);

    return this.prisma.plan.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: string) {
    return this.prisma.plan.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}