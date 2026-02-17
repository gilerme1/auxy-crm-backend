/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) { super(); }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(), context.getClass(),
        ]);
        if (isPublic) return true;
        return super.canActivate(context);
    }

    handleRequest(err, user, info) {
        if (err || !user) {
        if (info?.name === 'TokenExpiredError') {
            throw new UnauthorizedException('Token caducado. Por favor, renueva tu sesión con refresh token.');
        } else if (info?.name === 'JsonWebTokenError') {
            throw new UnauthorizedException('Token inválido o malformado. Verifica el formato.');
        } else if (info?.message === 'No auth token') {
            throw new UnauthorizedException('Token de autenticación requerido en el header.');
        }
        throw err || new UnauthorizedException('Error de autenticación general.');
        }
        return user;
    }
}