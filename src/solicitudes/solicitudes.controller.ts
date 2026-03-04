/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
  UseInterceptors,
  UploadedFiles,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { File } from 'multer';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { AsignarSolicitudDto } from './dto/asignar-solicitud.dto';
import { FinalizarSolicitudDto } from './dto/finalizar-solicitud.dto';
import { CalificarSolicitudDto } from './dto/calificar-solicitud.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { QuerySolicitudDto } from './dto/query-solicitud.dto';
import { AceptarSolicitudDto } from './dto/aceptar-solicitud.dto';
import { CancelarSolicitudDto } from './dto/cancelar-solicitud.dto';
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


  @Post(':id/aceptar')
  @Roles(RolUsuario.PROVEEDOR_ADMIN, RolUsuario.PROVEEDOR_OPERADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aceptar una solicitud pendiente (Modelo Marketplace)' })
  aceptar(
    @Param('id') id: string,
    @Body() dto: AceptarSolicitudDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.solicitudesService.aceptarMarketplace(id, dto, userId);
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
  @Roles(RolUsuario.CLIENTE_ADMIN, RolUsuario.CLIENTE_OPERADOR)
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
    @Body() dto: CancelarSolicitudDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRole: RolUsuario,
  ) {
    return this.solicitudesService.cancelar(id, dto.motivo, userId, userRole);
  }

  @Post(':id/fotos')
  @Roles(RolUsuario.CLIENTE_ADMIN, RolUsuario.CLIENTE_OPERADOR, RolUsuario.PROVEEDOR_OPERADOR)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB por archivo
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir fotos a una solicitud' })
  uploadFotos(
    @Param('id') id: string,
    @UploadedFiles() files: File[],
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRole: RolUsuario,
  ) {
    return this.solicitudesService.uploadFotos(id, files, userId, userRole);
  }

  @Delete(':id/fotos')
  @Roles(RolUsuario.CLIENTE_ADMIN, RolUsuario.CLIENTE_OPERADOR, RolUsuario.PROVEEDOR_OPERADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una foto de una solicitud' })
  deleteFoto(
    @Param('id') id: string,
    @Body('fotoUrl') fotoUrl: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRole: RolUsuario,
  ) {
    return this.solicitudesService.deleteFoto(id, fotoUrl, userId, userRole);
  }
}