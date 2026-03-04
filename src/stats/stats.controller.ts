import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Estadísticas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('super-admin')
  @Roles(RolUsuario.SUPER_ADMIN)
  @ApiOperation({ summary: 'Estadísticas globales (Solo Super Admin)' })
  @ApiResponse({ status: 200, description: 'Métricas de la plataforma completa' })
  async getSuperAdminStats() {
    return this.statsService.getSuperAdminStats();
  }

  @Get('proveedor')
  @Roles(RolUsuario.PROVEEDOR_ADMIN)
  @ApiOperation({ summary: 'Estadísticas de mi empresa proveedora' })
  @ApiResponse({ status: 200, description: 'Métricas de rentabilidad y servicios' })
  async getProveedorStats(@CurrentUser('proveedorId') proveedorId: string) {
    if (!proveedorId) throw new ForbiddenException('No tienes un proveedor asociado');
    return this.statsService.getProveedorStats(proveedorId);
  }

  @Get('cliente')
  @Roles(RolUsuario.CLIENTE_ADMIN)
  @ApiOperation({ summary: 'Estadísticas de mi empresa cliente' })
  @ApiResponse({ status: 200, description: 'Métricas de gastos y frecuencia de incidentes' })
  async getClienteStats(@CurrentUser('empresaId') empresaId: string) {
    if (!empresaId) throw new ForbiddenException('No tienes una empresa asociada');
    return this.statsService.getClienteStats(empresaId);
  }
}
