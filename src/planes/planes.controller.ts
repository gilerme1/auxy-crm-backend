import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlanesService } from './planes.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Planes')
@ApiBearerAuth()
@Controller('planes')
export class PlanesController {
    constructor(private readonly planesService: PlanesService) {}

    @Post()
    @Roles(RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Crear plan' })
    @ApiResponse({ status: 201, description: 'Plan creado' })
    create(@Body() dto: CreatePlanDto) {
      return this.planesService.create(dto);
    }

    @Get()
    @Roles(RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Listar planes' })
    @ApiResponse({ status: 200, description: 'Lista de planes' })
    findAll(@Query('includeInactive') includeInactive: boolean = false) {
      return this.planesService.findAll(includeInactive);
    }

    @Get(':id')
    @Roles(RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Obtener plan por ID' })
    @ApiResponse({ status: 200, description: 'Plan encontrado' })
    @ApiResponse({ status: 404, description: 'Plan no encontrado' })
    findOne(@Param('id') id: string) {
      return this.planesService.findOne(id);
    }

    @Patch(':id')
    @Roles(RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Actualizar plan' })
    @ApiResponse({ status: 200, description: 'Plan actualizado' })
    update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
      return this.planesService.update(id, dto);
    }

    @Delete(':id')
    @Roles(RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Soft delete plan' })
    @ApiResponse({ status: 200, description: 'Plan eliminado' })
    remove(@Param('id') id: string) {
      return this.planesService.softDelete(id);
    }
}