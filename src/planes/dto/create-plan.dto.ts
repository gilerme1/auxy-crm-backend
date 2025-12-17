import { IsString, IsNumber, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlanDto {
    @ApiProperty({ example: 'Plan Básico' })
    @IsString()
    nombre: string;

    @ApiProperty({ example: 'Plan para pequeñas empresas', required: false })
    @IsOptional()
    @IsString()
    descripcion?: string;

    @ApiProperty({ type: [String], example: ['GRUA', 'BATERIA'] })
    @IsArray()
    @IsString({ each: true })
    serviciosIncluidos: string[];

    @ApiProperty({ example: 99.99 })
    @IsNumber()
    precioMensual: number;
}