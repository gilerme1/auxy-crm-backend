/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import type { Multer } from 'multer';
import { RolUsuario, Prisma, EstadoDisponibilidad } from '@prisma/client';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
  ) {}

  async create(dto: CreateUsuarioDto, currentUserRole: RolUsuario) {
    if (
      currentUserRole !== RolUsuario.SUPER_ADMIN &&
      dto.rol === RolUsuario.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Solo super admins pueden crear otros super admins',
      );
    }
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existingUser)
      throw new ConflictException(`El email ${dto.email} ya está registrado`);

    if (dto.empresaId) {
      const empresa = await this.prisma.empresa.findUnique({
        where: { id: dto.empresaId, isActive: true },
      });
      if (!empresa)
        throw new NotFoundException(
          `La empresa con ID ${dto.empresaId} no existe o está inactiva`,
        );
    }

    if (dto.proveedorId) {
      const proveedor = await this.prisma.proveedor.findUnique({
        where: { id: dto.proveedorId, isActive: true },
      });
      if (!proveedor)
        throw new NotFoundException(
          `El proveedor con ID ${dto.proveedorId} no existe o está inactivo`,
        );
    }

    if (dto.empresaId && dto.proveedorId) {
      throw new BadRequestException(
        'Un usuario no puede estar vinculado a una empresa y a un proveedor simultáneamente',
      );
    }

    if (dto.vehiculoProveedorId) {
      if (
        dto.rol !== RolUsuario.PROVEEDOR_OPERADOR &&
        dto.rol !== RolUsuario.PROVEEDOR_ADMIN
      ) {
        throw new BadRequestException(
          'Solo los usuarios con rol PROVEEDOR_OPERADOR o PROVEEDOR_ADMIN pueden tener vehículo asignado',
        );
      }

      const vehiculoYaAsignado = await this.prisma.usuario.findFirst({
        where: { vehiculoProveedorId: dto.vehiculoProveedorId, isActive: true },
      });
      
      if (vehiculoYaAsignado) {
        throw new BadRequestException(
          `Este vehículo ya está asignado a ${vehiculoYaAsignado.nombre} ${vehiculoYaAsignado.apellido}`,
        );
      }

      const vehiculo = await this.prisma.vehiculoProveedor.findUnique({
        where: { id: dto.vehiculoProveedorId, isActive: true },
      });

      if (!vehiculo) {
        throw new NotFoundException(
          `El vehículo de proveedor con ID ${dto.vehiculoProveedorId} no existe o está inactivo`,
        );
      }
      if (dto.proveedorId && vehiculo.proveedorId !== dto.proveedorId) {
        throw new BadRequestException(
          'El vehículo debe pertenecer al mismo proveedor',
        );
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
      throw new BadRequestException('Formato de email inválido');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    return this.prisma.usuario.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        nombre: dto.nombre,
        apellido: dto.apellido,
        telefono: dto.telefono,
        rol: dto.rol,
        empresaId: dto.empresaId,
        proveedorId: dto.proveedorId,
        vehiculoProveedorId: dto.vehiculoProveedorId,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        empresaId: true,
        proveedorId: true,
        vehiculoProveedorId: true,
        isActive: true,
      },
    });
  }

  async findAll(
    userRole: RolUsuario,
    userEmpresaId?: string,
    userProveedorId?: string,
    query?: { page?: number; limit?: number },
  ) {
    const where: Prisma.UsuarioWhereInput = { isActive: true, deletedAt: null };
    if (userRole !== RolUsuario.SUPER_ADMIN) {
      if (userEmpresaId) {
        const empresaExists = await this.prisma.empresa.findUnique({
          where: { id: userEmpresaId },
        });
        if (!empresaExists)
          throw new NotFoundException(`Empresa ID ${userEmpresaId} no existe`);
        where.empresaId = userEmpresaId;
      } else if (userProveedorId) {
        const proveedorExists = await this.prisma.proveedor.findUnique({
          where: { id: userProveedorId },
        });
        if (!proveedorExists)
          throw new NotFoundException(
            `Proveedor ID ${userProveedorId} no existe`,
          );
        where.proveedorId = userProveedorId;
      } else {
        throw new ForbiddenException(
          'No tienes empresa o proveedor asignado para acceder a usuarios',
        );
      }
    }
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;
    return this.prisma.usuario.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        telefono: true,
        rol: true,
        isActive: true,
        empresaId: true,
        proveedorId: true,
        empresa: { select: { id: true, razonSocial: true } },
        proveedor: { select: { id: true, razonSocial: true } },
        vehiculoProveedorId: true,
        vehiculoProveedor: { select: { id: true, patente: true, marca: true, modelo: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(
    id: string,
    userRole: RolUsuario,
    userEmpresaId?: string,
    userProveedorId?: string,
    includeInactive = false,
  ) {
    const where: Prisma.UsuarioWhereUniqueInput = { id };
    if (!includeInactive) {
      where['isActive'] = true;
    }
    const user = await this.prisma.usuario.findUnique({
      where,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        telefono: true,
        rol: true,
        isActive: true,
        empresaId: true,
        proveedorId: true,
        empresa: { select: { id: true, razonSocial: true } },
        proveedor: { select: { id: true, razonSocial: true } },
        vehiculoProveedorId: true,
        vehiculoProveedor: { select: { id: true, patente: true, marca: true, modelo: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (userRole !== RolUsuario.SUPER_ADMIN) {
      const perteneceAEmpresa =
        userEmpresaId && user.empresaId === userEmpresaId;
      const perteneceAProveedor =
        userProveedorId && user.proveedorId === userProveedorId;

      if (!perteneceAEmpresa && !perteneceAProveedor) {
        throw new ForbiddenException(
          `No tienes acceso al usuario con ID ${id}`,
        );
      }
    }

    return user;
  }

  async update(id: string, dto: UpdateUsuarioDto, currentUserRole: RolUsuario) {
    const user = await this.findOne(id, RolUsuario.SUPER_ADMIN);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.usuario.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException(`El email ${dto.email} ya está registrado`);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
        throw new BadRequestException('Formato de email inválido');
      }
    }

    if (
      (dto.rol || dto.empresaId || dto.proveedorId) &&
      currentUserRole !== RolUsuario.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Solo super admins pueden cambiar rol o asignaciones de empresa/proveedor',
      );
    }

    if (dto.vehiculoProveedorId !== undefined) {
      if (
        dto.vehiculoProveedorId &&
        user.rol !== RolUsuario.PROVEEDOR_OPERADOR
      ) {
        throw new BadRequestException(
          'Solo los operadores de proveedor pueden tener vehículo asignado',
        );
      }
      if (dto.vehiculoProveedorId) {
        const vehiculo = await this.prisma.vehiculoProveedor.findUnique({
          where: { id: dto.vehiculoProveedorId, isActive: true },
        });
        if (!vehiculo) {
          throw new NotFoundException(
            `El vehículo de proveedor con ID ${dto.vehiculoProveedorId} no existe o está inactivo`,
          );
        }
        if (user.proveedorId && vehiculo.proveedorId !== user.proveedorId) {
          throw new BadRequestException(
            'El vehículo debe pertenecer al mismo proveedor',
          );
        }
      }
    }

    const updateData: Prisma.UsuarioUpdateInput = { ...dto };

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 12);
    }

    return this.prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        isActive: true,
      },
    });
  }

  async updateDisponibilidad(
    userId: string,
    dto: {
      estado: EstadoDisponibilidad;
      ubicacion?: { lat: number; lng: number };
    },
  ) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });
    if (!user || user.rol !== RolUsuario.PROVEEDOR_OPERADOR) {
      throw new ForbiddenException(
        `Usuario ${userId} no es operador de proveedor o no existe`,
      );
    }

    if (dto.ubicacion) {
      if (
        typeof dto.ubicacion.lat !== 'number' ||
        dto.ubicacion.lat < -90 ||
        dto.ubicacion.lat > 90 ||
        typeof dto.ubicacion.lng !== 'number' ||
        dto.ubicacion.lng < -180 ||
        dto.ubicacion.lng > 180
      ) {
        throw new BadRequestException('Coordenadas de ubicación inválidas');
      }
    }

    return this.prisma.usuario.update({
      where: { id: userId },
      data: {
        estadoDisponibilidad: dto.estado,
        ultimaUbicacion: dto.ubicacion
          ? { ...dto.ubicacion, updatedAt: new Date() }
          : undefined,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario ${userId} no encontrado`);
    }

    const isValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException(
        'Nueva contraseña debe tener al menos 8 caracteres',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async toggleActive(id: string, currentUser: { id: string; rol: RolUsuario }) {
    const user = await this.prisma.usuario.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    if (
      user.rol === RolUsuario.SUPER_ADMIN &&
      currentUser.rol !== RolUsuario.SUPER_ADMIN
    ) {
      throw new ForbiddenException('No puedes desactivar un SUPER_ADMIN');
    }

    if (id === currentUser.id) {
      throw new ForbiddenException('No puedes desactivarte a ti mismo');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
  }

  async softDelete(
    id: string,
    currentUser: { rol: RolUsuario; empresaId?: string; proveedorId?: string },
  ) {
    const user = await this.prisma.usuario.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    if (currentUser.rol !== RolUsuario.SUPER_ADMIN) {
      const belongsToSameEmpresa =
        currentUser.empresaId && user.empresaId === currentUser.empresaId;
      const belongsToSameProveedor =
        currentUser.proveedorId && user.proveedorId === currentUser.proveedorId;

      if (!belongsToSameEmpresa && !belongsToSameProveedor) {
        throw new ForbiddenException(
          'No tienes permiso para eliminar usuarios fuera de tu organización',
        );
      }

      if (user.rol === RolUsuario.SUPER_ADMIN) {
        throw new ForbiddenException('No puedes eliminar a un SUPER_ADMIN');
      }
    }

    if (user.deletedAt) {
      throw new BadRequestException(
        `Usuario ${user.email} ya ha sido eliminado`,
      );
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Subir foto de perfil para un usuario
   */
  async uploadFotoPerfil(userId: string, file: Multer.File) {
    const user: any = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fotoPerfil: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario ${userId} no encontrado`);
    }

    if (!file) {
      throw new BadRequestException('No se proporcionó archivo');
    }

    try {
      // Si el usuario ya tiene foto de perfil, eliminarla
      if (user.fotoPerfil) {
        const publicId = this.filesService.extractPublicId(user.fotoPerfil);
        if (publicId) {
          await this.filesService.deleteFile(publicId, 'image');
        }
      }

      // Subir nueva foto
      const result = await this.filesService.uploadFile(file, {
        folder: `auxy/usuarios/${userId}`,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
        maxFileSize: 3 * 1024 * 1024, // 3MB para fotos de perfil
      });

      return this.prisma.usuario.update({
        where: { id: userId },
        data: { fotoPerfil: result.secure_url },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          fotoPerfil: true,
          rol: true,
        },
      } as any);
    } catch (error) {
      this.logger.error(
        `Error subiendo foto de perfil para usuario ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Eliminar foto de perfil de un usuario
   */
  async deleteFotoPerfil(userId: string) {
    const user: any = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fotoPerfil: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario ${userId} no encontrado`);
    }

    if (!user.fotoPerfil) {
      throw new BadRequestException('El usuario no tiene foto de perfil');
    }

    try {
      const publicId = this.filesService.extractPublicId(user.fotoPerfil);
      if (publicId) {
        await this.filesService.deleteFile(publicId, 'image');
      }

      return this.prisma.usuario.update({
        where: { id: userId },
        data: { fotoPerfil: null },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          fotoPerfil: true,
          rol: true,
        },
      } as any);
    } catch (error) {
      this.logger.error(
        `Error eliminando foto de perfil para usuario ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
