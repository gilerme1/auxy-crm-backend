/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { EmpresasService } from '../empresas/empresas.service';
import { ProveedoresService } from '../proveedores/proveedores.service';
import { RegisterEmpresaDto } from './dto/register-empresa.dto';
import { RegisterProveedorDto } from './dto/register-proveedor.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, RolUsuario } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
      private prisma: PrismaService,
      private jwtService: JwtService,
      private config: ConfigService,
      private empresasService: EmpresasService,
      private proveedoresService: ProveedoresService,
    ) {}

  async register(dto: RegisterDto) {
    // Verificar si el email ya existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const empresaRoles = ['CLIENTE_ADMIN', 'CLIENTE_OPERADOR'];
    const proveedorRoles = ['PROVEEDOR_ADMIN', 'PROVEEDOR_OPERADOR'];

  // ───────────────────────────────────────────────
  // Validaciones para roles de EMPRESA
  // ───────────────────────────────────────────────
  if (empresaRoles.includes(dto.rol)) {
    if (!dto.empresaId) {
      throw new BadRequestException(
        'Usuarios con rol CLIENTE_ADMIN o CLIENTE_OPERADOR deben proporcionar un empresaId válido',
      );
    }

    // Verificar que la empresa existe y está activa
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: dto.empresaId },
    });

    if (!empresa) {
      throw new NotFoundException(`No existe ninguna empresa con ID: ${dto.empresaId}`);
    }

    if (!empresa.isActive) {
      throw new BadRequestException('La empresa seleccionada está inactiva');
    }

    // Prohibir que un usuario de empresa tenga proveedorId
    if (dto.proveedorId) {
      throw new BadRequestException(
        'Los usuarios con rol CLIENTE_ADMIN o CLIENTE_OPERADOR no pueden tener proveedorId. ' +
        'Solo deben estar asociados a una empresa.',
      );
    }
  }

  // ───────────────────────────────────────────────
  // Validaciones para roles de PROVEEDOR
  // ───────────────────────────────────────────────
  if (proveedorRoles.includes(dto.rol)) {
    if (!dto.proveedorId) {
      throw new BadRequestException(
        'Usuarios con rol PROVEEDOR_ADMIN o PROVEEDOR_OPERADOR deben proporcionar un proveedorId válido',
      );
    }

    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: dto.proveedorId },
    });

    if (!proveedor) {
      throw new NotFoundException(`No existe ningún proveedor con ID: ${dto.proveedorId}`);
    }

    if (!proveedor.isActive) {
      throw new BadRequestException('El proveedor seleccionado está inactivo');
    }

    // Prohibir que un proveedor tenga empresaId
    if (dto.empresaId) {
      throw new BadRequestException(
        'Los usuarios con rol PROVEEDOR_ADMIN o PROVEEDOR_OPERADOR no pueden tener empresaId. ' +
        'Solo deben estar asociados a un proveedor.',
      );
    }
  }

  // ───────────────────────────────────────────────
  // Roles que NO requieren asociación (ej: SUPER_ADMIN)
  // No se hace nada especial aquí
  // ───────────────────────────────────────────────
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Crear usuario
    const user = await this.prisma.usuario.create({
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

    const tokens = await this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  // ───────────────────────────────────────────────
  // Registro self-service EMPRESA
  // ───────────────────────────────────────────────
  async registerEmpresa(dto: RegisterEmpresaDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validaciones de unicidad (fuera o dentro de tx, pero mejor fuera para mejor mensaje)
      await this.checkEmailUnique(dto.email);
      await this.empresasService.checkCuitUnique(dto.cuit); // asumiendo que agregaste este método

      if (!dto.contactoTelefono) {
        throw new BadRequestException('El teléfono de contacto de la empresa es obligatorio');
      }

      // 2. Crear empresa (transaccional)
      const empresa = await this.empresasService.createInTransaction(tx, {
        razonSocial: dto.razonSocial,
        cuit: dto.cuit,
        direccion: dto.direccion,
        email: dto.contactoEmail,
        telefono: dto.contactoTelefono,
        planId: dto.planId, 
      });

      // 3. Crear usuario con rol fijo
      const hashedPassword = await bcrypt.hash(dto.password, 12);
      const usuario = await tx.usuario.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          nombre: dto.nombre,
          apellido: dto.apellido,
          telefono: dto.telefono,
          rol: RolUsuario.CLIENTE_ADMIN,
          empresaId: empresa.id,
          proveedorId: null,
        },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          rol: true,
          empresaId: true,
        },
      });

      // 4. Generar tokens (auto-login)
      const tokens = await this.generateTokens(usuario, tx);

      return {
        message: 'Empresa y cuenta de administrador creadas exitosamente',
        user: usuario,
        empresa: { 
          id: empresa.id, 
          razonSocial: empresa.razonSocial 
        },
        ...tokens,
      };
    });
  }

  // ───────────────────────────────────────────────
  // Registro self-service PROVEEDOR (muy similar)
  // ───────────────────────────────────────────────
  async registerProveedor(dto: RegisterProveedorDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.checkEmailUnique(dto.email);
      await this.proveedoresService.checkCuitUnique(dto.cuit); // asumiendo método agregado

      const proveedor = await this.proveedoresService.createInTransaction(tx, {
        razonSocial: dto.razonSocial,
        cuit: dto.cuit,
        email: dto.contactoEmail,
        telefono: dto.contactoTelefono,
        direccion: dto.direccion,
        serviciosOfrecidos: dto.serviciosOfrecidos,
        zonasCobertura: dto.zonasCobertura ? JSON.stringify(dto.zonasCobertura) : null,
      });

      const hashedPassword = await bcrypt.hash(dto.password, 12);
      const usuario = await tx.usuario.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          nombre: dto.nombre,
          apellido: dto.apellido,
          telefono: dto.telefono,
          rol: RolUsuario.PROVEEDOR_ADMIN,
          empresaId: null,
          proveedorId: proveedor.id,
        },
        select: {           
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          rol: true,
          empresaId: true, 
        },
      });

      const tokens = await this.generateTokens(usuario, tx);

      return {
        message: 'Proveedor y cuenta de administrador creados exitosamente',
        user: usuario,
        proveedor: { 
          id: proveedor.id, 
          razonSocial: proveedor.razonSocial 
        },
        ...tokens,
      };
    });
  }

  private async checkEmailUnique(email: string) {
    const exists = await this.prisma.usuario.findUnique({ where: { email } });
    if (exists) throw new ConflictException('El email ya está registrado');
  }

  async login(dto: LoginDto) {
    // Buscar usuario
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar si está activo
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
        empresaId: user.empresaId,
        proveedorId: user.proveedorId,
        fotoPerfil: user.fotoPerfil,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verificar el refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      // Buscar el token en la BD
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { usuario: true },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      // Verificar expiración
      if (new Date() > storedToken.expiresAt) {
        await this.prisma.refreshToken.delete({ 
          where: { id: storedToken.id } 
        });
        throw new UnauthorizedException('Refresh token expirado');
      }

      // Generar nuevos tokens
      const tokens = await this.generateTokens(storedToken.usuario);

      // Eliminar el refresh token usado
      await this.prisma.refreshToken.delete({ 
        where: { id: storedToken.id } 
      });

      return tokens;
      
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async logout(userId: string) {
    // Eliminar todos los refresh tokens del usuario
    await this.prisma.refreshToken.deleteMany({
      where: { usuarioId: userId },
    });

    return { message: 'Sesión cerrada exitosamente' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
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
        fotoPerfil: true,
        empresa: {
          select: {
            id: true,
            razonSocial: true,
          },
        },
        proveedor: {
          select: {
            id: true,
            razonSocial: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }

  private async generateTokens(user: any, tx?: Prisma.TransactionClient) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
      empresaId: user.empresaId,
      proveedorId: user.proveedorId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '30m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Usa tx si existe, sino el cliente Prisma global
    const prismaClient = tx || this.prisma;

    await prismaClient.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Validar o crear usuario desde Google OAuth
   * Si existe el usuario por email, actualiza el registro
   * Si no existe, crea uno nuevo con rol CLIENTE_OPERADOR por defecto
   */
  async validateOrCreateGoogleUser(googleProfile: any) {
    const { email, nombre, apellido, fotoPerfil } = googleProfile;

    // Buscar usuario existente por email
    let user = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (user) {
      // Actualizar fotoPerfil si viene del OAuth
      if (fotoPerfil && !user.fotoPerfil) {
        user = await this.prisma.usuario.update({
          where: { email },
          data: { fotoPerfil },
        });
      }

      if (!user?.isActive) {
        throw new UnauthorizedException('Usuario inactivo o no encontrado');
      }

      // Generar tokens
      const tokens = await this.generateTokens(user);
      return {
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          rol: user.rol,
          empresaId: user.empresaId,
          proveedorId: user.proveedorId,
          fotoPerfil: user.fotoPerfil,
        },
        ...tokens,
        isNewUser: false,
      };
    }

    // Crear nuevo usuario con rol CLIENTE_OPERADOR por defecto
    const newUser = await this.prisma.usuario.create({
      data: {
        email,
        nombre,
        apellido,
        fotoPerfil,
        password: '', // Sin contraseña en OAuth
        rol: RolUsuario.CLIENTE_OPERADOR,
        isActive: true,
      },
    });

    // Generar tokens para el nuevo usuario
    const tokens = await this.generateTokens(newUser);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        rol: newUser.rol,
        empresaId: newUser.empresaId,
        proveedorId: newUser.proveedorId,
        fotoPerfil: newUser.fotoPerfil,
      },
      ...tokens,
      isNewUser: true,
      message: 'Usuario creado exitosamente. Por favor completa tu perfil.',
    };
  }
}




