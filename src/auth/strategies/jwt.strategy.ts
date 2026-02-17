import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private config: ConfigService,
        private prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get<string>('JWT_SECRET') || 'secret_missing_in_env',
        });
    }

    async validate(payload: JwtPayload) {
        if (!payload.sub) {
        throw new UnauthorizedException('Token inválido: falta subject (sub)');
        }

        const user = await this.prisma.usuario.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                email: true,
                rol: true,
                isActive: true,
                empresaId: true,
                proveedorId: true,
                // NO traigas password ni campos sensibles
            }
        });

        if (!user) {
        throw new UnauthorizedException('Usuario asociado al token no encontrado');
        }

        if (!user.isActive) {
        throw new UnauthorizedException('Cuenta de usuario desactivada');
        }

        return {
        id: user.id,
        email: user.email,
        rol: user.rol,
        empresaId: user.empresaId,
        proveedorId: user.proveedorId,
        sub: payload.sub, // mantenemos compatibilidad si algún lugar lo espera
        };
    }
}