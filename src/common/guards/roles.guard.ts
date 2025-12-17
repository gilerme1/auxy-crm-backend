/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
        // Si es ruta pública, no verificar roles
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
        ]);

        if (isPublic) {
        return true;
        }

        const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
        ]);

        // Si no hay roles requeridos, permitir acceso
        if (!requiredRoles || requiredRoles.length === 0) {
        return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user) {
        throw new ForbiddenException('Usuario no autenticado');
        }

        // SUPER_ADMIN tiene acceso a todo
        if (user.rol === RolUsuario.SUPER_ADMIN) {
        return true;
        }

        const hasRole = requiredRoles.includes(user.rol);

        if (!hasRole) {
        throw new ForbiddenException('No tienes permisos para acceder a este recurso');
        }

        return true;
    }
}