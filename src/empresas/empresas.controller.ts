import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RolUsuario } from '@prisma/client';

@ApiTags('Empresas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token requerido o inv�lido' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Post()
  @Roles(RolUsuario.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear empresa' })
  @ApiResponse({ status: 201, description: 'Empresa creada' })
  @ApiResponse({ status: 409, description: 'CUIT duplicado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  create(@Body() dto: CreateEmpresaDto, @CurrentUser('rol') userRole: RolUsuario) {
    return this.empresasService.create(dto, userRole);
  }

  @Get()
  @ApiOperation({ summary: 'Listar empresas' })
  @ApiResponse({ status: 200, description: 'Lista de empresas' })
  findAll(
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') empresaId?: string,
  ) {
    return this.empresasService.findAll(userRole, empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener empresa por ID' })
  @ApiResponse({ status: 200, description: 'Empresa encontrada' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.empresasService.findOne(id, userRole, userEmpresaId);
  }

  @Patch(':id')
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN)
  @ApiOperation({ summary: 'Actualizar empresa' })
  @ApiResponse({ status: 200, description: 'Empresa actualizada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateEmpresaDto>,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.empresasService.update(id, dto, userRole, userEmpresaId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(RolUsuario.SUPER_ADMIN)
  @ApiOperation({ summary: 'Eliminar empresa (soft delete)' })
  @ApiResponse({ status: 200, description: 'Empresa eliminada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  remove(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.empresasService.remove(id, userRole, userEmpresaId);
  }

  @Get(':id/vehiculos-empresa')
  @ApiOperation({ summary: 'Obtener veh�culos de la empresa' })
  getVehiculosEmpresa(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.empresasService.getVehiculosEmpresa(id, userRole, userEmpresaId);
  }

  @Get(':id/solicitudes')
  @ApiOperation({ summary: 'Obtener solicitudes de la empresa' })
  getSolicitudes(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.empresasService.getSolicitudes(id, userRole, userEmpresaId);
  }
}


