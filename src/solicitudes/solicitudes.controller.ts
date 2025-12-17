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
  ApiQuery,
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
    @Roles(RolUsuario.ADMIN, RolUsuario.OPERATOR)
    @ApiOperation({ summary: 'Crear solicitud de auxilio' })
    @ApiResponse({ status: 201, description: 'Solicitud creada' })
    @ApiResponse({ status: 403, description: 'Sin permisos' })
    @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
    create(
      @Body() dto: CreateSolicitudDto,
      @CurrentUser('sub') userId: string,
    ) {
      return this.solicitudesService.create(dto, userId);
    }

    @Get()
    @ApiOperation({ summary: 'Listar solicitudes' })
    @ApiResponse({ status: 200, description: 'Lista de solicitudes' })
    findAll(
      @Query() query: QuerySolicitudDto,
      @CurrentUser('sub') userId: string,
      @CurrentUser('rol') userRole: string,
    ) {
      return this.solicitudesService.findAll(query, userId, userRole);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener solicitud por ID' })
    @ApiResponse({ status: 200, description: 'Solicitud encontrada' })
    @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
    findOne(
      @Param('id') id: string,
      @CurrentUser('sub') userId: string,
      @CurrentUser('rol') userRole: string,
    ) {
      return this.solicitudesService.findOne(id, userId, userRole);
    }

    @Post(':id/asignar')
    @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Asignar solicitud a proveedor' })
    @ApiResponse({ status: 200, description: 'Solicitud asignada' })
    @ApiResponse({ status: 400, description: 'Estado no válido' })
    asignar(
      @Param('id') id: string,
      @Body() dto: AsignarSolicitudDto,
      @CurrentUser('sub') userId: string,
    ) {
      return this.solicitudesService.asignar(id, dto, userId);
    }

    @Patch(':id/estado')
    @Roles(RolUsuario.PROVIDER, RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Cambiar estado de solicitud' })
    @ApiResponse({ status: 200, description: 'Estado actualizado' })
    @ApiResponse({ status: 400, description: 'Transición inválida' })
    cambiarEstado(
      @Param('id') id: string,
      @Body() dto: CambiarEstadoDto,
      @CurrentUser('sub') userId: string,
      @CurrentUser('rol') userRole: string,
    ) {
      return this.solicitudesService.cambiarEstado(id, dto, userId, userRole);
    }

    @Post(':id/finalizar')
    @Roles(RolUsuario.PROVIDER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Finalizar servicio' })
    @ApiResponse({ status: 200, description: 'Servicio finalizado' })
    @ApiResponse({ status: 400, description: 'Estado no válido' })
    finalizar(
      @Param('id') id: string,
      @Body() dto: FinalizarSolicitudDto,
      @CurrentUser('sub') userId: string,
    ) {
      return this.solicitudesService.finalizar(id, dto, userId);
    }

    @Post(':id/calificar')
    @Roles(RolUsuario.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Calificar servicio' })
    @ApiResponse({ status: 200, description: 'Servicio calificado' })
    @ApiResponse({ status: 400, description: 'Servicio ya calificado o no finalizado' })
    calificar(
      @Param('id') id: string,
      @Body() dto: CalificarSolicitudDto,
      @CurrentUser('sub') userId: string,
    ) {
      return this.solicitudesService.calificar(id, dto, userId);
    }

    @Post(':id/cancelar')
    @Roles(RolUsuario.ADMIN, RolUsuario.OPERATOR)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancelar solicitud' })
    @ApiResponse({ status: 200, description: 'Solicitud cancelada' })
    @ApiResponse({ status: 400, description: 'No se puede cancelar' })
    cancelar(
      @Param('id') id: string,
      @Body('motivo') motivo: string,
      @CurrentUser('sub') userId: string,
      @CurrentUser('rol') userRole: string,
    ) {
      return this.solicitudesService.cancelar(id, motivo, userId, userRole);
    }
}