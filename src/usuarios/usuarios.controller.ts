import { Controller, Get, Post, Body, Patch, Param, Delete, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { EstadoDisponibilidad, RolUsuario } from '@prisma/client';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN, RolUsuario.PROVEEDOR_ADMIN)
  @ApiOperation({ summary: 'Crear usuario (SUPER_ADMIN, gerentes de cliente o proveedor)' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 409, description: 'Email duplicado' })
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  findAll(
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') empresaId?: string,
    @CurrentUser('proveedorId') proveedorId?: string,
  ) {
    return this.usuariosService.findAll(userRole, empresaId, proveedorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('rol') userRole: RolUsuario,
    @CurrentUser('empresaId') empresaId?: string,
    @CurrentUser('proveedorId') proveedorId?: string,
  ) {
    return this.usuariosService.findOne(id, userRole, empresaId, proveedorId);
  }

  @Patch(':id')
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN, RolUsuario.PROVEEDOR_ADMIN)
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, dto);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Cambiar contraseña' })
  @ApiResponse({ status: 200, description: 'Contraseña cambiada' })
  changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser('sub') userId: string,
  ) {
    if (id !== userId) {
      throw new UnauthorizedException('Solo puedes cambiar tu propia contraseña');
    }
    return this.usuariosService.changePassword(id, dto);
  }

  @Patch(':id/active')
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN, RolUsuario.PROVEEDOR_ADMIN)
  @ApiOperation({ summary: 'Toggle activo/inactivo' })
  @ApiResponse({ status: 200, description: 'Estado cambiado' })
  toggleActive(@Param('id') id: string) {
    return this.usuariosService.toggleActive(id);
  }

  @Delete(':id')
  @Roles(RolUsuario.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  remove(@Param('id') id: string) {
    return this.usuariosService.softDelete(id);
  }

  @Post('disponibilidad')
  @Roles(RolUsuario.PROVEEDOR_OPERADOR)
  @ApiOperation({ summary: 'Actualizar estado de disponibilidad (solo operadores de proveedor)' })
  async updateDisponibilidad(
    @CurrentUser('sub') userId: string,
    @Body() dto: { estado: EstadoDisponibilidad; ubicacion?: { lat: number; lng: number } },
  ) {
    return await this.usuariosService.updateDisponibilidad(userId, dto);
  }
}