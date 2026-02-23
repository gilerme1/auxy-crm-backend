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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Clientes')
@ApiBearerAuth()
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @Roles(RolUsuario.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear cliente' })
  @ApiResponse({ status: 201, description: 'Empresa creada' })
  @ApiResponse({ status: 409, description: 'CUIT duplicado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  create(
    @Body() dto: CreateClienteDto,
    @CurrentUser('rol') userRole: RolUsuario,           
  ) {
    return this.clientesService.create(dto, userRole);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  @ApiResponse({ status: 200, description: 'Lista de empresas' })
  findAll(
    @CurrentUser('rol') userRole: RolUsuario,           // ← tipado como RolUsuario
    @CurrentUser('empresaId') empresaId?: string,
  ) {
    return this.clientesService.findAll(userRole, empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  @ApiResponse({ status: 200, description: 'Empresa encontrada' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.clientesService.findOne(id, userRole, userEmpresaId);
  }

  @Patch(':id')
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN)
  @ApiOperation({ summary: 'Actualizar cliente' })
  @ApiResponse({ status: 200, description: 'Empresa actualizada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateClienteDto>,
    @CurrentUser('rol') userRole: RolUsuario,           // ← agregado
    @CurrentUser('empresaId') userEmpresaId?: string,   // ← agregado
  ) {
    return this.clientesService.update(id, dto, userRole, userEmpresaId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(RolUsuario.SUPER_ADMIN)
  @ApiOperation({ summary: 'Eliminar cliente (soft delete)' })
  @ApiResponse({ status: 200, description: 'Empresa eliminada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  remove(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,           // ← agregado
    @CurrentUser('empresaId') userEmpresaId?: string,   // ← agregado (aunque no siempre se usa)
  ) {
    return this.clientesService.remove(id, userRole, userEmpresaId);
  }

  @Get(':id/vehiculos')
  @ApiOperation({ summary: 'Obtener vehículos del cliente' })
  getVehiculos(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.clientesService.getVehiculos(id, userRole, userEmpresaId);
  }

  @Get(':id/solicitudes')
  @ApiOperation({ summary: 'Obtener solicitudes del cliente' })
  getSolicitudes(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') userEmpresaId?: string,
  ) {
    return this.clientesService.getSolicitudes(id, userRole, userEmpresaId);
  }
}

