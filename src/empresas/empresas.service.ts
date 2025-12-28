import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { RolUsuario } from '@prisma/client';

@Injectable()
export class EmpresasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEmpresaDto) {
    // Verificar CUIT único
    const existingEmpresa = await this.prisma.empresa.findUnique({
      where: { cuit: dto.cuit },
    });

    if (existingEmpresa) {
      throw new ConflictException('El CUIT ya está registrado');
    }

    // Si hay planId, verificar que existe
    if (dto.planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: dto.planId },
      });

      if (!plan || !plan.isActive) {
        throw new NotFoundException('Plan no encontrado o inactivo');
      }
    }

    return this.prisma.empresa.create({
      data: dto,
      include: { plan: true },
    });
  }

  async findAll(userRole: string, empresaId?: string) {
    // Si es ADMIN, solo ve su propia empresa
    if (userRole === RolUsuario.CLIENTE_ADMIN || userRole === RolUsuario.CLIENTE_OPERADOR) {
      if (!empresaId) {
        throw new ForbiddenException('No tienes empresa asignada');
      }

      const empresa = await this.prisma.empresa.findUnique({
        where: { id: empresaId },
        include: {
          plan: true,
          _count: {
            select: {
              vehiculos: true,
              solicitudes: true,
            },
          },
        },
      });

      return [empresa];
    }

    // SUPER_ADMIN ve todas
    return this.prisma.empresa.findMany({
      where: { isActive: true },
      include: {
        plan: true,
        _count: {
          select: {
            vehiculos: true,
            usuarios: true,
            solicitudes: true,
          },
        },
      },
      orderBy: { razonSocial: 'asc' },
    });
  }

  async findOne(id: string, userRole: string, userEmpresaId?: string) {
    // Verificar acceso
    if (
      (userRole === RolUsuario.CLIENTE_ADMIN || userRole === RolUsuario.CLIENTE_OPERADOR) &&
      id !== userEmpresaId
    ) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      include: {
        plan: true,
        usuarios: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            rol: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            vehiculos: true,
            solicitudes: true,
          },
        },
      },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return empresa;
  }

  async update(id: string, dto: Partial<CreateEmpresaDto>) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Si se intenta cambiar el CUIT, verificar que no exista
    if (dto.cuit && dto.cuit !== empresa.cuit) {
      const existing = await this.prisma.empresa.findUnique({
        where: { cuit: dto.cuit },
      });

      if (existing) {
        throw new ConflictException('El CUIT ya está registrado');
      }
    }

    return this.prisma.empresa.update({
      where: { id },
      data: dto,
      include: { plan: true },
    });
  }

  async remove(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      include: {
        _count: {
          select: { solicitudes: true },
        },
      },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Soft delete
    return this.prisma.empresa.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getVehiculos(id: string, userRole: string, userEmpresaId?: string) {
    // Verificar acceso
    if (
      (userRole === RolUsuario.CLIENTE_ADMIN || userRole === RolUsuario.CLIENTE_OPERADOR) &&
      id !== userEmpresaId
    ) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    return this.prisma.vehiculo.findMany({
      where: { empresaId: id, estado: { not: 'INACTIVO' } },
      orderBy: { patente: 'asc' },
    });
  }

  async getSolicitudes(id: string, userRole: string, userEmpresaId?: string) {
    // Verificar acceso
    if (
      (userRole === RolUsuario.CLIENTE_ADMIN || userRole === RolUsuario.CLIENTE_OPERADOR) &&
      id !== userEmpresaId
    ) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    return this.prisma.solicitudAuxilio.findMany({
      where: { empresaId: id },
      include: {
        vehiculo: true,
        proveedor: {
          select: {
            id: true,
            razonSocial: true,
          },
        },
      },
      orderBy: { fechaSolicitud: 'desc' },
      take: 50,
    });
  }
}