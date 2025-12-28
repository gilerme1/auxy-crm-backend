/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehiculoProveedorDto } from './dto/create-vehiculo-proveedor.dto';
import { UpdateVehiculoProveedorDto } from './dto/update-vehiculo-proveedor.dto';
import { RolUsuario } from '@prisma/client';

@Injectable()
export class VehiculosProveedorService {
    constructor(private prisma: PrismaService) {}

    async create(dto: CreateVehiculoProveedorDto, currentUser: { id: string; rol: string; proveedorId?: string }) {
        // Verificar patente única
        const existing = await this.prisma.vehiculoProveedor.findUnique({
        where: { patente: dto.patente.toUpperCase() },
        });

        if (existing) {
        throw new ConflictException('La patente ya está registrada');
        }

        // Solo PROVEEDOR_ADMIN puede crear para su empresa
        if (
        currentUser.rol !== RolUsuario.PROVEEDOR_ADMIN &&
        currentUser.rol !== RolUsuario.SUPER_ADMIN
        ) {
        throw new ForbiddenException('Solo administradores de proveedor pueden crear vehículos');
        }

        if (currentUser.rol !== RolUsuario.SUPER_ADMIN && dto.proveedorId !== currentUser.proveedorId) {
        throw new ForbiddenException('No puedes crear vehículos para otro proveedor');
        }

        // Verificar que el proveedor existe
        const proveedor = await this.prisma.proveedor.findUnique({
        where: { id: dto.proveedorId },
        });

        if (!proveedor || !proveedor.isActive) {
        throw new NotFoundException('Proveedor no encontrado o inactivo');
        }

        return this.prisma.vehiculoProveedor.create({
        data: {
            ...dto,
            patente: dto.patente.toUpperCase(),
        },
        include: { proveedor: { select: { id: true, razonSocial: true } } },
        });
    }

    async findAll(currentUser: { rol: string; proveedorId?: string }) {
        const where: any = { isActive: true, deletedAt: null };

        if (currentUser.rol !== RolUsuario.SUPER_ADMIN) {
        if (!currentUser.proveedorId) {
            throw new ForbiddenException('No tienes proveedor asignado');
        }
        where.proveedorId = currentUser.proveedorId;
        }

        return this.prisma.vehiculoProveedor.findMany({
        where,
        include: {
            proveedor: { select: { id: true, razonSocial: true } },
            _count: { select: { solicitudes: true } },
        },
        orderBy: { patente: 'asc' },
        });
    }

    async findOne(id: string, currentUser: { rol: string; proveedorId?: string }) {
        const vehiculo = await this.prisma.vehiculoProveedor.findUnique({
        where: { id },
        include: {
            proveedor: { select: { id: true, razonSocial: true } },
            solicitudes: {
            orderBy: { fechaSolicitud: 'desc' },
            take: 5,
            },
        },
        });

        if (!vehiculo) {
        throw new NotFoundException('Vehículo de proveedor no encontrado');
        }

        if (
        currentUser.rol !== RolUsuario.SUPER_ADMIN &&
        vehiculo.proveedorId !== currentUser.proveedorId
        ) {
        throw new ForbiddenException('No tienes acceso a este vehículo');
        }

        return vehiculo;
    }

    async update(id: string, dto: UpdateVehiculoProveedorDto, currentUser: { rol: string; proveedorId?: string }) {
        const vehiculo = await this.prisma.vehiculoProveedor.findUnique({ where: { id } });

        if (!vehiculo) {
        throw new NotFoundException('Vehículo de proveedor no encontrado');
        }

        if (
        currentUser.rol !== RolUsuario.SUPER_ADMIN &&
        vehiculo.proveedorId !== currentUser.proveedorId
        ) {
        throw new ForbiddenException('No tienes permiso para modificar este vehículo');
        }

        if (dto.patente && dto.patente.toUpperCase() !== vehiculo.patente) {
        const existing = await this.prisma.vehiculoProveedor.findUnique({
            where: { patente: dto.patente.toUpperCase() },
        });
        if (existing) {
            throw new ConflictException('La patente ya está registrada');
        }
        }

        return this.prisma.vehiculoProveedor.update({
        where: { id },
        data: {
            ...dto,
            patente: dto.patente ? dto.patente.toUpperCase() : undefined,
        },
        include: { proveedor: { select: { id: true, razonSocial: true } } },
        });
    }

    async softDelete(id: string, currentUser: { rol: string; proveedorId?: string }) {
        const vehiculo = await this.prisma.vehiculoProveedor.findUnique({ where: { id } });

        if (!vehiculo) {
        throw new NotFoundException('Vehículo de proveedor no encontrado');
        }

        if (
        currentUser.rol !== RolUsuario.SUPER_ADMIN &&
        vehiculo.proveedorId !== currentUser.proveedorId
        ) {
        throw new ForbiddenException('No tienes permiso para eliminar este vehículo');
        }

        return this.prisma.vehiculoProveedor.update({
        where: { id },
        data: {
            isActive: false,
            deletedAt: new Date(),
        },
        });
    }

    async getHistorial(id: string, currentUser: { rol: string; proveedorId?: string }) {
        const vehiculo = await this.prisma.vehiculoProveedor.findUnique({ where: { id } });

        if (!vehiculo) {
        throw new NotFoundException('Vehículo de proveedor no encontrado');
        }

        if (
        currentUser.rol !== RolUsuario.SUPER_ADMIN &&
        vehiculo.proveedorId !== currentUser.proveedorId
        ) {
        throw new ForbiddenException('No tienes acceso a este historial');
        }

        return this.prisma.solicitudAuxilio.findMany({
        where: { vehiculoProveedorId: id },
        include: {
            solicitadoPor: { select: { nombre: true, apellido: true } },
            empresa: { select: { razonSocial: true } },
        },
        orderBy: { fechaSolicitud: 'desc' },
        take: 20,
        });
    }
}