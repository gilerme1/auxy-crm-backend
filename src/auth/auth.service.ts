/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
    constructor(
      private prisma: PrismaService,
      private jwtService: JwtService,
      private config: ConfigService,
    ) {}

    async register(dto: RegisterDto) {
      // Verificar si el email ya existe
      const existingUser = await this.prisma.usuario.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }

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
          await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
          throw new UnauthorizedException('Refresh token expirado');
        }

        // Generar nuevos tokens
        const tokens = await this.generateTokens(storedToken.usuario);

        // Eliminar el refresh token usado
        await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

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

    private async generateTokens(user: any) {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        rol: user.rol,
        empresaId: user.empresaId,
        proveedorId: user.proveedorId,
      };

      // Access token (corta duración)
      const accessToken = this.jwtService.sign(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
      });

      // Refresh token (larga duración)
      const refreshToken = this.jwtService.sign(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      });

      // Guardar refresh token en BD
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          usuarioId: user.id,
          expiresAt,
        },
      });

      return {
        accessToken,
        refreshToken,
      };
    }
}