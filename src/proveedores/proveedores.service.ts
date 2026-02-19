/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { RolUsuario, Prisma, EstadoSolicitud } from '@prisma/client';

@Injectable()
export class ProveedoresService {
  constructor(private prisma: PrismaService) {}

  // Agregar en la clase o como utility
  // private validateCuit(cuit: string): boolean {
  //   if (!/^\d{11}$/.test(cuit)) return false; // Básico: 11 dígitos
  //   return true;
  // }

  async create(dto: CreateProveedorDto, currentUser: { rol: RolUsuario; id?: string }) {
    if (currentUser.rol !== RolUsuario.SUPER_ADMIN) {
      throw new ForbiddenException('Solo el personal de la plataforma puede crear proveedores');
    }

    const existing = await this.prisma.proveedor.findUnique({
      where: { cuit: dto.cuit },
    });

    if (existing) {
      throw new ConflictException('El CUIT ya está registrado');
    }

    // if (!this.validateCuit(dto.cuit)) {
    //   throw new BadRequestException('CUIT inválido: debe ser 11 dígitos numéricos');
    // }

    if (!dto.razonSocial?.trim()) {
      throw new BadRequestException('La razón social es obligatoria');
    }

    // try {
    //   JSON.parse(dto.zonasCobertura as any); // Asegurar JSON válido
    // } catch {
    //   throw new BadRequestException('El campo zonasCobertura debe ser un JSON válido');
    // }
    if (!Array.isArray(dto.serviciosOfrecidos) || dto.serviciosOfrecidos.length === 0) {
      throw new BadRequestException('Debe especificar al menos un servicio ofrecido');
    }

    return this.prisma.proveedor.create({
      data: dto,
    });
  }

  async createInTransaction(
    tx: Prisma.TransactionClient,
    dto: CreateProveedorDto,
  ) {
    const existing = await tx.proveedor.findUnique({
      where: { cuit: dto.cuit },
    });
    if (existing) {
      throw new ConflictException('El CUIT ya está registrado');
    }

    if (!dto.razonSocial?.trim()) {
      throw new BadRequestException('La razón social es obligatoria');
    }

    if (!Array.isArray(dto.serviciosOfrecidos) || dto.serviciosOfrecidos.length === 0) {
      throw new BadRequestException('Debe especificar al menos un servicio ofrecido');
    }

    // Opcional: validar JSON de zonasCobertura
    if (dto.zonasCobertura) {
      try {
        JSON.parse(dto.zonasCobertura as any);
      } catch {
        throw new BadRequestException('El campo zonasCobertura debe ser un JSON válido');
      }
    }

    return tx.proveedor.create({ data: dto });
  }
  
  async findAll(userRole: RolUsuario, activo?: boolean, userProveedorId?: string) {
    // CORRECCIÓN: Usamos el tipo específico de Prisma en lugar de 'any'
    const where: Prisma.ProveedorWhereInput = { deletedAt: null };

    if (activo !== undefined) {
      where.isActive = activo;
    }

    if (userRole !== RolUsuario.SUPER_ADMIN) {
      if (!userProveedorId) {
        throw new ForbiddenException('No tienes proveedor asociado');
      }
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
        solicitudes: { select: { id: true, estado: true, fechaSolicitud: true } },
        vehiculosProveedor: true,
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

    // if (dto.cuit) {
    //   if (!this.validateCuit(dto.cuit)) throw new BadRequestException('CUIT inválido');
    // }

    if (dto.cuit && dto.cuit !== proveedor.cuit) {
      const existing = await this.prisma.proveedor.findUnique({ 
        where: { cuit: dto.cuit } 
      });
      if (existing) {
        throw new ConflictException('El CUIT ya está registrado');
      }
    }

    if (dto.razonSocial !== undefined && !dto.razonSocial?.trim()) {
      throw new BadRequestException('La razón social no puede estar vacía');
    }

    if (dto.zonasCobertura !== undefined) {
      try { JSON.parse(dto.zonasCobertura as any); } catch {
        throw new BadRequestException('zonasCobertura debe ser JSON válido');
      }
    }

    if (dto.serviciosOfrecidos !== undefined) {
      if (!Array.isArray(dto.serviciosOfrecidos) || dto.serviciosOfrecidos.length === 0) {
        throw new BadRequestException('Debe haber al menos un servicio ofrecido');
      }
    }

    return this.prisma.proveedor.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: string) {
    const pendientes = await this.prisma.solicitudAuxilio.count({
      where: { proveedorId: id, estado: { in: [EstadoSolicitud.PENDIENTE, EstadoSolicitud.ASIGNADO, EstadoSolicitud.EN_CAMINO, EstadoSolicitud.EN_SERVICIO] } },
    });
    if (pendientes > 0) throw new BadRequestException('No se puede inactivar: hay solicitudes pendientes');

    return this.prisma.proveedor.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async getEstadisticas(id: string, userRole: RolUsuario, userProveedorId?: string) {
    if (userRole !== RolUsuario.SUPER_ADMIN && id !== userProveedorId) {
      throw new ForbiddenException('No tienes permiso para ver estadísticas de otros proveedores');
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

  async checkCuitUnique(cuit: string): Promise<void> {
    const existing = await this.prisma.proveedor.findUnique({
      where: { cuit },
    });
    if (existing) {
      throw new ConflictException(`El CUIT ${cuit} ya está registrado en un proveedor`);
    }
  }
}