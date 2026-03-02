import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { VehiculosEmpresaService } from './vehiculos-empresa.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('vehiculos-empresa')
@ApiBearerAuth()
@Controller('vehiculos-empresa')
@UseGuards(JwtAuthGuard) // Todas las rutas requieren autenticación
export class VehiculosController {
  constructor(private readonly vehiculosEmpresaService: VehiculosEmpresaService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN)
  @ApiOperation({ summary: 'Crear vehículo/recurso del proveedor' })
  @ApiResponse({ status: 201, description: 'Vehículo creado exitosamente' })
  @ApiConflictResponse({ description: 'La patente ya está registrada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o empresa inactiva' })
  @ApiForbiddenResponse({ description: 'No tienes permiso para crear en esa empresa' })
  create(
    @Body() createVehiculoDto: CreateVehiculoDto,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.vehiculosEmpresaService.create(createVehiculoDto, userRole, userEmpresaId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar vehículos del proveedor',
  })
  @ApiResponse({ status: 200, description: 'Lista de vehículos obtenida' })
  @ApiForbiddenResponse({ description: 'No tienes empresa asignada (para roles cliente)' })
  findAll(
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') empresaId?: string,
  ) {
    return this.vehiculosEmpresaService.findAll(userRole, empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener vehículo de proveedor por ID' })
  @ApiParam({ name: 'id', description: 'ID del vehículo (UUID)' })
  @ApiResponse({ status: 200, description: 'Vehículo encontrado' })
  @ApiNotFoundResponse({ description: 'Vehículo no encontrado' })
  @ApiForbiddenResponse({ description: 'No tienes acceso a este vehículo' })
  @ApiBadRequestResponse({ description: 'Vehículo inactivo' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.vehiculosEmpresaService.findOne(id, userRole, userEmpresaId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN)
  @ApiOperation({ summary: 'Actualizar datos de vehículo del proveedor' })
  @ApiParam({ name: 'id', description: 'ID del vehículo (UUID)' })
  @ApiBody({ type: CreateVehiculoDto, description: 'Campos a actualizar (parcial)' })
  @ApiResponse({ status: 200, description: 'Vehículo actualizado exitosamente' })
  @ApiNotFoundResponse({ description: 'Vehículo no encontrado' })
  @ApiForbiddenResponse({ description: 'No tienes permiso para modificar este vehículo' })
  @ApiConflictResponse({ description: 'La nueva patente ya está registrada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o empresa destino inválida' })
  update(
    @Param('id') id: string,
    @Body() updateVehiculoDto: Partial<CreateVehiculoDto>,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.vehiculosEmpresaService.update(id, updateVehiculoDto, userRole, userEmpresaId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN)
  @ApiOperation({
    summary: 'Inactivar un vehículo (cambio de estado a INACTIVO - soft delete)',
  })
  @ApiParam({ name: 'id', description: 'ID del vehículo (UUID)' })
  @ApiResponse({ status: 200, description: 'Vehículo inactivado exitosamente' })
  @ApiNotFoundResponse({ description: 'Vehículo no encontrado' })
  @ApiForbiddenResponse({ description: 'No tienes permiso para inactivar este vehículo' })
  remove(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.vehiculosEmpresaService.remove(id, userRole, userEmpresaId);
  }

  @Get(':id/historial')
  @ApiOperation({ summary: 'Historial de solicitudes atendidas por este vehículo' })
  @ApiParam({ name: 'id', description: 'ID del vehículo (UUID)' })
  @ApiResponse({ status: 200, description: 'Historial de solicitudes obtenido' })
  @ApiNotFoundResponse({ description: 'Vehículo no encontrado' })
  @ApiForbiddenResponse({ description: 'No tienes acceso al historial de este vehículo' })
  getHistorial(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.vehiculosEmpresaService.getHistorial(id, userRole, userEmpresaId);
  }
}