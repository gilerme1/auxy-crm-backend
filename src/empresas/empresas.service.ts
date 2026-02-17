import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { RolUsuario } from '@prisma/client';

@Injectable()
export class EmpresasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEmpresaDto, userRole: RolUsuario) {
    // Validación adicional: Solo SUPER_ADMIN puede crear empresas
    if (userRole !== RolUsuario.SUPER_ADMIN) {
      throw new ForbiddenException('Solo super administradores pueden crear empresas');
    }
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

      if (!plan) {
          throw new NotFoundException('Plan no encontrado');
        }

      if (!plan.isActive) {
        throw new BadRequestException('El plan seleccionado está inactivo');
      }
    }

    // Asegurarse de que no falten campos requeridos (aunque DTO lo maneja, agregamos mensajes simples)
    if (!dto.razonSocial || !dto.cuit || !dto.telefono || !dto.email || !dto.direccion) {
      throw new BadRequestException('Faltan campos requeridos: razón social, CUIT, teléfono, email o dirección');
    }

    return this.prisma.empresa.create({
      data: dto,
      include: { plan: true },
    });
  }

async findAll(userRole: RolUsuario, empresaId?: string) {
    // Validación: Si no es SUPER_ADMIN y no tiene empresa asignada
    if (
      (userRole === RolUsuario.CLIENTE_ADMIN || userRole === RolUsuario.CLIENTE_OPERADOR) && !empresaId
    ) {
      throw new ForbiddenException('No tienes una empresa asignada');
    }

    // Si es CLIENTE_ADMIN o CLIENTE_OPERADOR, solo ve su propia empresa
    if (userRole === RolUsuario.CLIENTE_ADMIN || userRole === RolUsuario.CLIENTE_OPERADOR) {
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

      if (!empresa) {
        throw new NotFoundException('Empresa no encontrada');
      }

      return [empresa];
    }

    // SUPER_ADMIN ve todas las activas
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

async findOne(id: string, userRole: RolUsuario, userEmpresaId?: string) {
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

    // Verificar acceso
    if (
      (userRole === RolUsuario.CLIENTE_ADMIN || userRole === RolUsuario.CLIENTE_OPERADOR) &&
      id !== userEmpresaId
    ) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    if (!empresa.isActive) {
      throw new BadRequestException('Esta empresa está inactiva');
    }

    return empresa;
  }

  async update(id: string, dto: Partial<CreateEmpresaDto>, userRole: RolUsuario, userEmpresaId?: string) {
    // Primero, verificar acceso reutilizando findOne (que ya incluye validaciones de acceso y existencia)
    const empresa = await this.findOne(id, userRole, userEmpresaId);

    // Validación adicional: Solo SUPER_ADMIN o CLIENTE_ADMIN pueden actualizar
    if (userRole !== RolUsuario.SUPER_ADMIN && userRole !== RolUsuario.CLIENTE_ADMIN) {
      throw new ForbiddenException('No tienes permiso para actualizar esta empresa, solo SUPER_ADMIN o CLIENTE_ADMIN pueden actualizar');
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

    // Si se cambia planId, verificar que exista y esté activo
    if (dto.planId && dto.planId !== empresa.planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: dto.planId },
      });

      if (!plan) {
        throw new NotFoundException('Plan no encontrado');
      }

      if (!plan.isActive) {
        throw new BadRequestException('El plan seleccionado está inactivo');
      }
    }

    return this.prisma.empresa.update({
      where: { id },
      data: dto,
      include: { plan: true },
    });
  }

  async remove(id: string, userRole: RolUsuario, userEmpresaId?: string) {
    // Primero, verificar acceso reutilizando findOne
    await this.findOne(id, userRole, userEmpresaId);

    // Validación adicional: Solo SUPER_ADMIN puede eliminar
    if (userRole !== RolUsuario.SUPER_ADMIN) {
      throw new ForbiddenException('Solo super administradores pueden eliminar empresas');
    }

    // Soft delete
    return this.prisma.empresa.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getVehiculos(id: string, userRole: RolUsuario, userEmpresaId?: string) {
    // Verificar acceso reutilizando findOne
    await this.findOne(id, userRole, userEmpresaId);

    return this.prisma.vehiculo.findMany({
      where: { empresaId: id, estado: { not: 'INACTIVO' } },
      orderBy: { patente: 'asc' },
    });
  }

  async getSolicitudes(id: string, userRole: RolUsuario, userEmpresaId?: string) {
    // Verificar acceso reutilizando findOne
    await this.findOne(id, userRole, userEmpresaId);

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