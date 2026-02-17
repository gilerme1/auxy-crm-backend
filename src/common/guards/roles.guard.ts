/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(), context.getClass(),
        ]);
        if (isPublic) return true;

        const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [
            context.getHandler(), context.getClass(),
        ]) || [];

        const { user } = context.switchToHttp().getRequest();
        if (!user) throw new ForbiddenException('Usuario no autenticado. Token requerido o inválido.');

        // SUPER_ADMIN siempre pasa
        if (user.rol === RolUsuario.SUPER_ADMIN) return true;

        if (requiredRoles.length === 0) return true;

        if (!requiredRoles.some(role => user.rol === role)) {
            throw new ForbiddenException(
                `Acceso denegado. Rol(es) requerido(s): ${requiredRoles.join(', ')}. ` +
                `Rol actual: ${user.rol}`
            );
        }

        return true;
    }
}