import { IsString, IsEmail, Length, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProveedorDto {
    @ApiProperty({ example: 'Servicios XYZ S.A.' })
    @IsString()
    razonSocial: string;

    @ApiProperty({ example: '211234567890' })
    @IsString()
    @Length(11, 11)
    cuit: string;

    @ApiProperty({ example: 'contacto@xyz.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '+598 99 123 456' })
    @IsString()
    telefono: string;

    @ApiProperty({ example: 'Av. 8 de Octubre 5678', required: false })
    @IsOptional()
    @IsString()
    direccion?: string;

    @ApiProperty({ type: [String], example: ['GRUA', 'MECANICO'] })
    @IsArray()
    @IsString({ each: true })
    serviciosOfrecidos: string[];

    @ApiProperty({ example: '{ "type": "Polygon", "coordinates": [...] }', required: false })
    @IsOptional()
    zonasCobertura?: any; 
}