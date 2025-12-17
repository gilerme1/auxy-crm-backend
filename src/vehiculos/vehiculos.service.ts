/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { RolUsuario, EstadoVehiculo } from '@prisma/client';

@Injectable()
export class VehiculosService {
    constructor(private prisma: PrismaService) {}

    async create(dto: CreateVehiculoDto, userRole: string, userEmpresaId?: string) {
      // Verificar patente única
      const existing = await this.prisma.vehiculo.findUnique({
        where: { patente: dto.patente.toUpperCase() },
      });

      if (existing) {
        throw new ConflictException('La patente ya está registrada');
      }

      // Verificar permisos
      if (userRole !== RolUsuario.SUPER_ADMIN && dto.empresaId !== userEmpresaId) {
        throw new ForbiddenException('No puedes crear vehículos para otra empresa');
      }

      // Verificar que la empresa existe
      const empresa = await this.prisma.empresa.findUnique({
        where: { id: dto.empresaId },
      });

      if (!empresa) {
        throw new NotFoundException('Empresa no encontrada');
      }

      return this.prisma.vehiculo.create({
        data: {
          ...dto,
          patente: dto.patente.toUpperCase(),
        },
        include: { empresa: true },
      });
    }

    async findAll(userRole: string, empresaId?: string) {
      const where: any = {};

      // Filtrar por empresa según el rol
      if (userRole !== RolUsuario.SUPER_ADMIN) {
        if (!empresaId) {
          throw new ForbiddenException('No tienes empresa asignada');
        }
        where.empresaId = empresaId;
      }

      return this.prisma.vehiculo.findMany({
        where,
        include: {
          empresa: {
            select: {
              id: true,
              razonSocial: true,
            },
          },
          _count: {
            select: { solicitudes: true },
          },
        },
        orderBy: { patente: 'asc' },
      });
    }

    async findOne(id: string, userRole: string, userEmpresaId?: string) {
      const vehiculo = await this.prisma.vehiculo.findUnique({
        where: { id },
        include: {
          empresa: true,
          solicitudes: {
            orderBy: { fechaSolicitud: 'desc' },
            take: 10,
          },
        },
      });

      if (!vehiculo) {
        throw new NotFoundException('Vehículo no encontrado');
      }

      // Verificar acceso
      if (
        userRole !== RolUsuario.SUPER_ADMIN &&
        vehiculo.empresaId !== userEmpresaId
      ) {
        throw new ForbiddenException('No tienes acceso a este vehículo');
      }

      return vehiculo;
    }

    async update(id: string, dto: Partial<CreateVehiculoDto>) {
      const vehiculo = await this.prisma.vehiculo.findUnique({
        where: { id },
      });

      if (!vehiculo) {
        throw new NotFoundException('Vehículo no encontrado');
      }

      // Si se cambia la patente, verificar que no exista
      if (dto.patente && dto.patente.toUpperCase() !== vehiculo.patente) {
        const existing = await this.prisma.vehiculo.findUnique({
          where: { patente: dto.patente.toUpperCase() },
        });

        if (existing) {
          throw new ConflictException('La patente ya está registrada');
        }
      }

      return this.prisma.vehiculo.update({
        where: { id },
        data: {
          ...dto,
          patente: dto.patente ? dto.patente.toUpperCase() : undefined,
        },
        include: { empresa: true },
      });
    }

    async remove(id: string) {
      const vehiculo = await this.prisma.vehiculo.findUnique({
        where: { id },
      });

      if (!vehiculo) {
        throw new NotFoundException('Vehículo no encontrado');
      }

      // Cambiar estado a INACTIVO
      return this.prisma.vehiculo.update({
        where: { id },
        data: { estado: EstadoVehiculo.INACTIVO },
      });
    }

    async getHistorial(id: string, userRole: string, userEmpresaId?: string) {
      const vehiculo = await this.prisma.vehiculo.findUnique({
        where: { id },
      });

      if (!vehiculo) {
        throw new NotFoundException('Vehículo no encontrado');
      }

      // Verificar acceso
      if (
        userRole !== RolUsuario.SUPER_ADMIN &&
        vehiculo.empresaId !== userEmpresaId
      ) {
        throw new ForbiddenException('No tienes acceso a este vehículo');
      }

      return this.prisma.solicitudAuxilio.findMany({
        where: { vehiculoId: id },
        include: {
          proveedor: {
            select: {
              id: true,
              razonSocial: true,
            },
          },
          solicitadoPor: {
            select: {
              nombre: true,
              apellido: true,
            },
          },
        },
        orderBy: { fechaSolicitud: 'desc' },
      });
    }
}