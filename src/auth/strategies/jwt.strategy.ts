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
        // Solución 1: Usar '!' para asegurar que no es undefined 
        // o un string vacío como fallback
        secretOrKey: config.get<string>('JWT_SECRET') || 'secret_missing_in_env',
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
        });

        // Solución 2: Cambiar .activo por .isActive según el error de TS
        if (!user || !user.isActive) { 
        throw new UnauthorizedException('Usuario no autorizado');
        }

        return payload; 
    }
}