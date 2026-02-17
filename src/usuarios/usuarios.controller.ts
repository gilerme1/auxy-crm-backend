/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Post, Body, Patch, Param, Delete, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiForbiddenResponse, ApiParam, ApiBody, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { EstadoDisponibilidad, RolUsuario } from '@prisma/client';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN, RolUsuario.PROVEEDOR_ADMIN)
  @ApiOperation({
    summary: 'Crear un nuevo usuario',
    description: 'SUPER_ADMIN puede crear cualquier tipo. CLIENTE_ADMIN solo para su empresa. PROVEEDOR_ADMIN solo para su proveedor.',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o combinación empresa/proveedor no permitida' })
  @ApiForbiddenResponse({ description: 'No tienes permisos para crear este tipo de usuario' })
  create(
    @Body() createUsuarioDto: CreateUsuarioDto,
    @CurrentUser('rol') currentUserRole: RolUsuario,
  ) {
    return this.usuariosService.create(createUsuarioDto, currentUserRole);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar usuarios accesibles',
    description: 'SUPER_ADMIN ve todos. CLIENTE_ADMIN/PROVEEDOR_ADMIN ven solo los de su organización.',
  })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN, RolUsuario.PROVEEDOR_ADMIN)
  @ApiOperation({
    summary: 'Actualizar usuario',
    description: 'Solo SUPER_ADMIN puede cambiar rol, empresaId o proveedorId. Otros solo campos básicos.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario a actualizar' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiForbiddenResponse({ description: 'No tienes permisos para realizar esta actualización' })
  async update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @CurrentUser('rol') currentUserRole: RolUsuario,
    @CurrentUser('sub') currentUserId: string,
  ) {
    return this.usuariosService.update(id, updateUsuarioDto, currentUserRole);
  }

  @Patch(':id/password')
  @ApiOperation({
    summary: 'Cambiar la contraseña del usuario',
    description: 'Solo el propio usuario puede cambiar su contraseña',
  })
  @ApiParam({ name: 'id', description: 'Debe coincidir con el ID del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada correctamente' })
  @ApiUnauthorizedResponse({ description: 'No puedes cambiar la contraseña de otro usuario' })
  changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser('sub') authenticatedUserId: string,
  ) {
    if (id !== authenticatedUserId) {
      throw new UnauthorizedException('Solo puedes cambiar tu propia contraseña');
    }

    return this.usuariosService.changePassword(id, changePasswordDto);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.CLIENTE_ADMIN, RolUsuario.PROVEEDOR_ADMIN)
  @ApiOperation({
    summary: 'Activar / desactivar un usuario (toggle isActive)',
    description: 'No se permite desactivar SUPER_ADMIN ni a uno mismo',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Estado activo/inactivo actualizado' })
  @ApiForbiddenResponse({ description: 'Acción no permitida (super admin, auto-desactivación, etc.)' })
  toggleActive(
    @Param('id') id: string,
    @CurrentUser('sub') currentUserId: string,
    @CurrentUser('rol') currentUserRole: RolUsuario,
  ) {
    // Mejor pasar objeto currentUser con id y rol
    return this.usuariosService.toggleActive(id, { id: currentUserId, rol: currentUserRole });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Soft-delete de un usuario (solo SUPER_ADMIN)',
    description: 'Marca isActive = false y establece deletedAt',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario a eliminar' })
  @ApiResponse({ status: 200, description: 'Usuario soft-deleted correctamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  remove(
    @Param('id') id: string,
    @CurrentUser('rol') currentUserRole: RolUsuario,
  ) {
    // Aunque ya está protegido por @Roles, pasamos el rol por consistencia
    return this.usuariosService.softDelete(id, currentUserRole);
  }

  @Post('disponibilidad')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.PROVEEDOR_OPERADOR)
  @ApiOperation({
    summary: 'Actualizar estado de disponibilidad y ubicación (solo choferes/técnicos)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        estado: { type: 'string', enum: Object.values(EstadoDisponibilidad) },
        ubicacion: {
          type: 'object',
          properties: { lat: { type: 'number' }, lng: { type: 'number' } },
        },
      },
      required: ['estado'],
    },
  })
  @ApiResponse({ status: 200, description: 'Disponibilidad actualizada' })
  @ApiForbiddenResponse({ description: 'Solo operadores de proveedor pueden actualizar disponibilidad' })
  updateDisponibilidad(
    @CurrentUser('sub') userId: string,
    @Body() dto: { estado: EstadoDisponibilidad; ubicacion?: { lat: number; lng: number } },
  ) {
    return this.usuariosService.updateDisponibilidad(userId, dto);
  }
}