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
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Empresas')
@ApiBearerAuth()
@Controller('empresas')
export class EmpresasController {
    constructor(private readonly empresasService: EmpresasService) {}

    @Post()
    @Roles(RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Crear empresa' })
    @ApiResponse({ status: 201, description: 'Empresa creada' })
    @ApiResponse({ status: 409, description: 'CUIT duplicado' })
    create(@Body() dto: CreateEmpresaDto) {
      return this.empresasService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar empresas' })
    @ApiResponse({ status: 200, description: 'Lista de empresas' })
    findAll(
      @CurrentUser('rol') userRole: string,
      @CurrentUser('empresaId') empresaId?: string,
    ) {
      return this.empresasService.findAll(userRole, empresaId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener empresa por ID' })
    @ApiResponse({ status: 200, description: 'Empresa encontrada' })
    @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
    findOne(
      @Param('id') id: string,
      @CurrentUser('rol') userRole: string,
      @CurrentUser('empresaId') userEmpresaId?: string,
    ) {
      return this.empresasService.findOne(id, userRole, userEmpresaId);
    }

    @Patch(':id')
    @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN)
    @ApiOperation({ summary: 'Actualizar empresa' })
    @ApiResponse({ status: 200, description: 'Empresa actualizada' })
    update(@Param('id') id: string, @Body() dto: Partial<CreateEmpresaDto>) {
      return this.empresasService.update(id, dto);
    }

    @Delete(':id')
    @Roles(RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Eliminar empresa (soft delete)' })
    @ApiResponse({ status: 200, description: 'Empresa eliminada' })
    remove(@Param('id') id: string) {
      return this.empresasService.remove(id);
    }

    @Get(':id/vehiculos')
    @ApiOperation({ summary: 'Obtener vehículos de la empresa' })
    getVehiculos(
      @Param('id') id: string,
      @CurrentUser('rol') userRole: string,
      @CurrentUser('empresaId') userEmpresaId?: string,
    ) {
      return this.empresasService.getVehiculos(id, userRole, userEmpresaId);
    }

    @Get(':id/solicitudes')
    @ApiOperation({ summary: 'Obtener solicitudes de la empresa' })
    getSolicitudes(
      @Param('id') id: string,
      @CurrentUser('rol') userRole: string,
      @CurrentUser('empresaId') userEmpresaId?: string,
    ) {
      return this.empresasService.getSolicitudes(id, userRole, userEmpresaId);
    }
}
