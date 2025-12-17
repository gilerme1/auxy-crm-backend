import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { RolUsuario, Prisma } from '@prisma/client';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUsuarioDto) {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
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
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        empresaId: true,
        proveedorId: true,
        isActive: true,
      },
    });
  }

  async findAll(userRole: RolUsuario, userEmpresaId?: string, userProveedorId?: string) {
    // CORRECCIÓN: Usar Prisma.UsuarioWhereInput en lugar de any
    const where: Prisma.UsuarioWhereInput = { 
      isActive: true, 
      deletedAt: null 
    };

    if (userRole !== RolUsuario.SUPER_ADMIN) {
      if (userEmpresaId) {
        where.empresaId = userEmpresaId;
      } else if (userProveedorId) {
        where.proveedorId = userProveedorId;
      } else {
        throw new UnauthorizedException('No tienes acceso');
      }
    }

    return this.prisma.usuario.findMany({
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
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userRole: RolUsuario, userEmpresaId?: string, userProveedorId?: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
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
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validación de acceso según pertenencia a empresa o proveedor
    if (userRole !== RolUsuario.SUPER_ADMIN) {
      const perteneceAEmpresa = userEmpresaId && user.empresaId === userEmpresaId;
      const perteneceAProveedor = userProveedorId && user.proveedorId === userProveedorId;

      if (!perteneceAEmpresa && !perteneceAProveedor) {
        throw new UnauthorizedException('No tienes acceso a este usuario');
      }
    }

    return user;
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    // Buscamos el usuario primero para validar su existencia y datos actuales
    const user = await this.findOne(id, RolUsuario.SUPER_ADMIN);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException('El email ya está registrado');
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
      }
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isValid) {
      throw new ConflictException('Contraseña actual incorrecta');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }

  async toggleActive(id: string) {
    const user = await this.prisma.usuario.findUnique({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
  }

  async softDelete(id: string) {
    return this.prisma.usuario.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}