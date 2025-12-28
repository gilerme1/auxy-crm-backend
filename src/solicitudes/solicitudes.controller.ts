/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { AsignarSolicitudDto } from './dto/asignar-solicitud.dto';
import { FinalizarSolicitudDto } from './dto/finalizar-solicitud.dto';
import { CalificarSolicitudDto } from './dto/calificar-solicitud.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { QuerySolicitudDto } from './dto/query-solicitud.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Solicitudes')
@ApiBearerAuth()
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Post()
  @Roles(RolUsuario.CLIENTE_ADMIN, RolUsuario.CLIENTE_OPERADOR)
  @ApiOperation({ summary: 'Crear solicitud de auxilio (solo flotas cliente)' })
  create(
    @Body() dto: CreateSolicitudDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.solicitudesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar solicitudes' })
  findAll(
    @Query() query: QuerySolicitudDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRole: RolUsuario, // ← Cambia a RolUsuario
  ) {
    return this.solicitudesService.findAll(query, userId, userRole);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener solicitud por ID' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRole: RolUsuario, // ← Cambia a RolUsuario
  ) {
    return this.solicitudesService.findOne(id, userId, userRole);
  }

  @Post(':id/asignar')
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Asignar solicitud a proveedor (y opcionalmente a recurso específico)',
    description: 'Envía proveedorId obligatorio y vehiculoProveedorId opcional.',
  })
  asignar(
    @Param('id') id: string,
    @Body() dto: AsignarSolicitudDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.solicitudesService.asignar(id, dto, userId);
  }

  @Get(':id/recursos-disponibles')
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN)
  @ApiOperation({ summary: 'Listar recursos (vehículos) disponibles del proveedor para esta solicitud' })
  async getRecursosDisponibles(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.solicitudesService.getRecursosDisponibles(id, userId);
  }


  @Patch(':id/estado')
  @Roles(RolUsuario.PROVEEDOR_OPERADOR, RolUsuario.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cambiar estado de solicitud' })
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRole: RolUsuario, // ← Cambia a RolUsuario
  ) {
    return this.solicitudesService.cambiarEstado(id, dto, userId, userRole);
  }

  @Post(':id/finalizar')
  @Roles(RolUsuario.PROVEEDOR_OPERADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalizar servicio' })
  finalizar(
    @Param('id') id: string,
    @Body() dto: FinalizarSolicitudDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.solicitudesService.finalizar(id, dto, userId);
  }

  @Post(':id/calificar')
  @Roles(RolUsuario.CLIENTE_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calificar servicio' })
  calificar(
    @Param('id') id: string,
    @Body() dto: CalificarSolicitudDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.solicitudesService.calificar(id, dto, userId);
  }

  @Post(':id/cancelar')
  @Roles(RolUsuario.CLIENTE_ADMIN, RolUsuario.CLIENTE_OPERADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar solicitud' })
  cancelar(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRole: RolUsuario, // ← Cambia a RolUsuario
  ) {
    return this.solicitudesService.cancelar(id, motivo, userId, userRole);
  }
}