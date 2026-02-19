/* eslint-disable @typescript-eslint/no-unused-vars */
// src/auth/dto/register-cliente.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterProveedorDto {
    @ApiProperty({ example: 'gerente@miempresa.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'MiClaveSegura2025' })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ example: 'Juan' })
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @ApiProperty({ example: 'Pérez' })
    @IsString()
    @IsNotEmpty()
    apellido: string;

    @ApiProperty({ example: '+59899123456', required: false })
    @IsString()
    @IsOptional()
    telefono?: string;

    // ── Campos del PROOVEDOR ──
    @ApiProperty({ example: 'Servicios XYZ S.A.' })
    @IsString()
    razonSocial: string;

    @ApiProperty({ example: '211234567890' })
    @IsString()
    @Length(11, 11)
    cuit: string;

    @ApiProperty({ example: 'contacto@xyz.com' })
    @IsEmail()
    contactoEmail: string;

    @ApiProperty({ example: '+598 99 123 456' })
    @IsString()
    contactoTelefono: string;

    @ApiProperty({ example: 'Av. 8 de Octubre 5678', required: false })
    @IsOptional()
    @IsString()
    direccion?: string;

    @ApiProperty({ type: [String], example: ['GRUA', 'MECANICO'] })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    serviciosOfrecidos: string[];

    @ApiProperty({ example: '{ "type": "Polygon", "coordinates": [...] }', required: false })
    @IsOptional()
    zonasCobertura?: any; 
}