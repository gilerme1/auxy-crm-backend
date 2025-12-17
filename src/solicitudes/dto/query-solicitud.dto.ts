import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EstadoSolicitud, TipoAuxilio } from '@prisma/client';

export class QuerySolicitudDto {
    @ApiProperty({ required: false, minimum: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ required: false, minimum: 1, maximum: 100, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiProperty({ enum: EstadoSolicitud, required: false })
    @IsOptional()
    @IsEnum(EstadoSolicitud)
    estado?: EstadoSolicitud;

    @ApiProperty({ enum: TipoAuxilio, required: false })
    @IsOptional()
    @IsEnum(TipoAuxilio)
    tipo?: TipoAuxilio;

    @ApiProperty({ required: false, example: 'uuid-empresa' })
    @IsOptional()
    @IsString()
    empresaId?: string;

    @ApiProperty({ required: false, example: 'uuid-proveedor' })
    @IsOptional()
    @IsString()
    proveedorId?: string;

    @ApiProperty({ required: false, example: 'uuid-vehiculo' })
    @IsOptional()
    @IsString()
    vehiculoId?: string;
}
