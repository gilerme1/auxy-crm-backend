import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VehiculosService } from './vehiculos.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Vehículos')
@ApiBearerAuth()
@Controller('vehiculos')
export class VehiculosController {
    constructor(private readonly vehiculosService: VehiculosService) {}

    @Post()
    @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN)
    @ApiOperation({ summary: 'Crear vehículo' })
    @ApiResponse({ status: 201, description: 'Vehículo creado' })
    @ApiResponse({ status: 409, description: 'Patente duplicada' })
    create(
      @Body() dto: CreateVehiculoDto,
      @CurrentUser('rol') userRole: string,
      @CurrentUser('empresaId') userEmpresaId?: string,
    ) {
      return this.vehiculosService.create(dto, userRole, userEmpresaId);
    }

    @Get()
    @ApiOperation({ summary: 'Listar vehículos' })
    @ApiResponse({ status: 200, description: 'Lista de vehículos' })
    findAll(
      @CurrentUser('rol') userRole: string,
      @CurrentUser('empresaId') empresaId?: string,
    ) {
      return this.vehiculosService.findAll(userRole, empresaId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener vehículo por ID' })
    @ApiResponse({ status: 200, description: 'Vehículo encontrado' })
    @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
    findOne(
      @Param('id') id: string,
      @CurrentUser('rol') userRole: string,
      @CurrentUser('empresaId') userEmpresaId?: string,
    ) {
      return this.vehiculosService.findOne(id, userRole, userEmpresaId);
    }

    @Patch(':id')
    @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN)
    @ApiOperation({ summary: 'Actualizar vehículo' })
    @ApiResponse({ status: 200, description: 'Vehículo actualizado' })
    update(@Param('id') id: string, @Body() dto: Partial<CreateVehiculoDto>) {
      return this.vehiculosService.update(id, dto);
    }

    @Delete(':id')
    @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN)
    @ApiOperation({ summary: 'Eliminar vehículo (cambiar a INACTIVO)' })
    @ApiResponse({ status: 200, description: 'Vehículo eliminado' })
    remove(@Param('id') id: string) {
      return this.vehiculosService.remove(id);
    }

    @Get(':id/historial')
    @ApiOperation({ summary: 'Obtener historial de auxilios del vehículo' })
    @ApiResponse({ status: 200, description: 'Historial de auxilios' })
    getHistorial(
      @Param('id') id: string,
      @CurrentUser('rol') userRole: string,
      @CurrentUser('empresaId') userEmpresaId?: string,
    ) {
      return this.vehiculosService.getHistorial(id, userRole, userEmpresaId);
    }
}
