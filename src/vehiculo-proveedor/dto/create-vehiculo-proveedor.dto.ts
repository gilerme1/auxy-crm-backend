import { IsString, IsInt, Min, Max, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoVehiculoProveedor, EstadoVehiculo } from '@prisma/client';

export class CreateVehiculoProveedorDto {
    @ApiProperty({ example: 'GRU001A' })
    @IsString()
    patente: string;

    @ApiProperty({ example: 'Volvo' })
    @IsString()
    marca: string;

    @ApiProperty({ example: 'FH16' })
    @IsString()
    modelo: string;

    @ApiProperty({ example: 2020, minimum: 1900, maximum: 2035 })
    @IsInt()
    @Min(1900)
    @Max(2035)
    año: number;

    @ApiProperty({ enum: TipoVehiculoProveedor, example: TipoVehiculoProveedor.GRUA_PESADA })
    @IsEnum(TipoVehiculoProveedor)
    tipo: TipoVehiculoProveedor;

    @ApiProperty({ example: 12000, description: 'Capacidad en kg (opcional)', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    capacidadKg?: number;

    @ApiProperty({ example: 'uuid-proveedor', description: 'ID del proveedor dueño' })
    @IsUUID()
    proveedorId: string;

    @ApiProperty({ enum: EstadoVehiculo, example: EstadoVehiculo.ACTIVO, required: false })
    @IsOptional()
    @IsEnum(EstadoVehiculo)
    estado?: EstadoVehiculo;
}