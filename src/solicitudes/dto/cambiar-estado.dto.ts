import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoSolicitud } from '@prisma/client';

export class CambiarEstadoDto {
    @ApiProperty({ enum: EstadoSolicitud, example: EstadoSolicitud.EN_CAMINO })
    @IsEnum(EstadoSolicitud)
    estado: EstadoSolicitud;

    @ApiProperty({ required: false, example: 'Cliente no respondió' })
    @IsOptional()
    @IsString()
    motivo?: string;
}