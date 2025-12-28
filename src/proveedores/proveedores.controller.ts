import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Proveedores')
@ApiBearerAuth()
@Controller('proveedores')
export class ProveedoresController {
    constructor(private readonly proveedoresService: ProveedoresService) {}

    @Post()
    @Roles(RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Crear proveedor' })
    @ApiResponse({ status: 201, description: 'Proveedor creado' })
    @ApiResponse({ status: 409, description: 'CUIT duplicado' })
    create(@Body() dto: CreateProveedorDto) {
      return this.proveedoresService.create(dto);
    }

  @Get()
    @ApiOperation({ summary: 'Listar proveedores' })
    @ApiResponse({ status: 200, description: 'Lista de proveedores' })
    findAll(
      @Query('activo') activo: boolean | undefined,
      @CurrentUser('rol') userRole: RolUsuario,
      @CurrentUser('proveedorId') proveedorId?: string,
    ) {
      return this.proveedoresService.findAll(userRole, activo, proveedorId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener proveedor por ID' })
    @ApiResponse({ status: 200, description: 'Proveedor encontrado' })
    @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
    findOne(
      @Param('id') id: string,
      @CurrentUser('rol') userRole: RolUsuario,
      @CurrentUser('proveedorId') proveedorId?: string,
    ) {
      return this.proveedoresService.findOne(id, userRole, proveedorId);
    }

    @Patch(':id')
    @Roles(RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Actualizar proveedor' })
    @ApiResponse({ status: 200, description: 'Proveedor actualizado' })
    update(@Param('id') id: string, @Body() dto: UpdateProveedorDto) {
      return this.proveedoresService.update(id, dto);
    }

    @Delete(':id')
    @Roles(RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Soft delete proveedor' })
    @ApiResponse({ status: 200, description: 'Proveedor eliminado' })
    remove(@Param('id') id: string) {
      return this.proveedoresService.softDelete(id);
    }

    @Get(':id/estadisticas')
    @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.PROVEEDOR_ADMIN)
    @ApiOperation({ summary: 'Obtener estadísticas del proveedor' })
    @ApiResponse({ status: 200, description: 'Estadísticas' })
    getEstadisticas(
      @Param('id') id: string,
      @CurrentUser('rol') userRole: RolUsuario,
      @CurrentUser('proveedorId') proveedorId?: string,
    ) {
      return this.proveedoresService.getEstadisticas(id, userRole, proveedorId);
    }
}