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
import { VehiculosProveedorService } from './vehiculos-proveedor.service';
import { CreateVehiculoProveedorDto } from './dto/create-vehiculo-proveedor.dto';
import { UpdateVehiculoProveedorDto } from './dto/update-vehiculo-proveedor.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Vehículos Proveedor')
@ApiBearerAuth()
@Controller('vehiculos-proveedor')
export class VehiculosProveedorController {
    constructor(private readonly vehiculosProveedorService: VehiculosProveedorService) {}

    @Post()
    @Roles(RolUsuario.PROVEEDOR_ADMIN, RolUsuario.SUPER_ADMIN)
    @ApiOperation({ summary: 'Crear vehículo/recurso del proveedor' })
    @ApiResponse({ status: 201, description: 'Vehículo creado' })
    @ApiResponse({ status: 409, description: 'Patente duplicada' })
    create(
        @Body() dto: CreateVehiculoProveedorDto,
        @CurrentUser('sub') userId: string,
        @CurrentUser('rol') rol: string,
        @CurrentUser('proveedorId') proveedorId?: string,
    ) {
        // create SÍ requiere id
        return this.vehiculosProveedorService.create(dto, { id: userId, rol, proveedorId });
    }

    @Get()
    @ApiOperation({ summary: 'Listar vehículos del proveedor' })
    @ApiResponse({ status: 200, description: 'Lista de vehículos' })
    findAll(
        @CurrentUser('rol') rol: string,
        @CurrentUser('proveedorId') proveedorId?: string,
    ) {
        // findAll NO requiere id
        return this.vehiculosProveedorService.findAll({ rol, proveedorId });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener vehículo de proveedor por ID' })
    @ApiResponse({ status: 200, description: 'Vehículo encontrado' })
    @ApiResponse({ status: 404, description: 'No encontrado' })
    findOne(
        @Param('id') id: string,
        @CurrentUser('rol') rol: string,
        @CurrentUser('proveedorId') proveedorId?: string,
    ) {
        // findOne NO requiere id del usuario
        return this.vehiculosProveedorService.findOne(id, { rol, proveedorId });
    }

    @Patch(':id')
    update(
    @Param('id') id: string,
    @Body() dto: UpdateVehiculoProveedorDto,
    @CurrentUser('rol') rol: string,
    @CurrentUser('proveedorId') proveedorId?: string,
    ) {
    return this.vehiculosProveedorService.update(id, dto, { rol, proveedorId });
    }

    @Delete(':id')
    remove(
    @Param('id') id: string,
    @CurrentUser('rol') rol: string,
    @CurrentUser('proveedorId') proveedorId?: string,
    ) {
    return this.vehiculosProveedorService.softDelete(id, { rol, proveedorId });
    }

    @Get(':id/historial')
    @ApiOperation({ summary: 'Historial de solicitudes atendidas por este vehículo' })
    @ApiResponse({ status: 200, description: 'Historial' })
    getHistorial(
        @Param('id') id: string,
        @CurrentUser('rol') rol: string,
        @CurrentUser('proveedorId') proveedorId?: string,
    ) {
        // getHistorial NO requiere id del usuario
        return this.vehiculosProveedorService.getHistorial(id, { rol, proveedorId });
    }
}