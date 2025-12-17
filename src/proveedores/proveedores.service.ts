import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { RolUsuario, Prisma, EstadoSolicitud } from '@prisma/client';

@Injectable()
export class ProveedoresService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProveedorDto) {
    const existing = await this.prisma.proveedor.findUnique({
      where: { cuit: dto.cuit },
    });

    if (existing) {
      throw new ConflictException('El CUIT ya está registrado');
    }

    return this.prisma.proveedor.create({
      data: dto,
    });
  }

  // CORRECCIÓN: El parámetro obligatorio 'userRole' ahora va primero
  async findAll(userRole: RolUsuario, activo?: boolean, userProveedorId?: string) {
    // CORRECCIÓN: Usamos el tipo específico de Prisma en lugar de 'any'
    const where: Prisma.ProveedorWhereInput = { deletedAt: null };

    if (activo !== undefined) {
      where.isActive = activo;
    }

    if (userRole !== RolUsuario.SUPER_ADMIN && userProveedorId) {
      where.id = userProveedorId;
    }

    return this.prisma.proveedor.findMany({
      where,
      include: {
        _count: {
          select: {
            solicitudes: true,
            usuarios: true,
          },
        },
      },
      orderBy: { razonSocial: 'asc' },
    });
  }

  async findOne(id: string, userRole: RolUsuario, userProveedorId?: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id },
      include: {
        usuarios: true,
        solicitudes: {
          select: { id: true, estado: true, fechaSolicitud: true },
        },
      },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    if (userRole !== RolUsuario.SUPER_ADMIN && id !== userProveedorId) {
      throw new ForbiddenException('No tienes acceso a este proveedor');
    }

    return proveedor;
  }

  async update(id: string, dto: UpdateProveedorDto) {
    // SUPER_ADMIN se pasa aquí para que findOne no bloquee la búsqueda inicial
    const proveedor = await this.findOne(id, RolUsuario.SUPER_ADMIN);

    if (dto.cuit && dto.cuit !== proveedor.cuit) {
      const existing = await this.prisma.proveedor.findUnique({ where: { cuit: dto.cuit } });
      if (existing) {
        throw new ConflictException('El CUIT ya está registrado');
      }
    }

    return this.prisma.proveedor.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: string) {
    return this.prisma.proveedor.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async getEstadisticas(id: string, userRole: RolUsuario, userProveedorId?: string) {
    if (userRole !== RolUsuario.SUPER_ADMIN && id !== userProveedorId) {
      throw new ForbiddenException('No tienes acceso');
    }

    const [proveedor, stats] = await Promise.all([
      this.prisma.proveedor.findUnique({ where: { id } }),
      this.prisma.solicitudAuxilio.groupBy({
        by: ['estado'],
        where: { proveedorId: id },
        _count: true,
      }),
    ]);

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    const totalServicios = await this.prisma.solicitudAuxilio.count({
      where: { proveedorId: id },
    });

    const serviciosFinalizados = await this.prisma.solicitudAuxilio.count({
      where: { 
        proveedorId: id,
        estado: EstadoSolicitud.FINALIZADO, // Uso del Enum para evitar strings mágicos
      },
    });

    const ingresoTotal = await this.prisma.solicitudAuxilio.aggregate({
      where: {
        proveedorId: id,
        estado: EstadoSolicitud.FINALIZADO,
        costoFinal: { not: null },
      },
      _sum: { costoFinal: true },
    });

    return {
      proveedor,
      estadisticas: {
        totalServicios,
        serviciosFinalizados,
        // Acceso seguro al resultado del aggregate
        ingresoTotal: ingresoTotal._sum.costoFinal ? Number(ingresoTotal._sum.costoFinal) : 0,
        estadoPorTipo: stats,
        tasaFinalizacion: totalServicios > 0 
          ? (serviciosFinalizados / totalServicios) * 100 
          : 0,
      },
    };
  }
}