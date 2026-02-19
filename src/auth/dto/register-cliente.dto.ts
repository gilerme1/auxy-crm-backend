/* eslint-disable @typescript-eslint/no-unused-vars */
// src/auth/dto/register-cliente.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterClienteDto {
    @ApiProperty({ example: 'gerente@miempresa.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'MiClaveSegura2025' })
    @IsString()
    @MinLength(6)
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

    // ── Campos de la EMPRESA ──
    @ApiProperty({ example: 'Transportes del Plata SA' })
    @IsString()
    @IsNotEmpty()
    razonSocial: string;

    @ApiProperty({ example: '210123456789' })
    @IsString()
    // @Matches(/^\d{11,12}$/, { message: 'CUIT debe tener 11 o 12 dígitos' })
    @IsNotEmpty()
    cuit: string;

    @ApiProperty({ example: 'Av. 18 de Julio 1234, Montevideo' })
    @IsString()
    @IsNotEmpty()
    direccion: string;

    @ApiProperty({ example: 'empresa@transportes.com' })
    @IsEmail()
    @IsNotEmpty()
    contactoEmail: string;

    @ApiProperty({ example: '+598 2901 2345', required: false })
    @IsString()
    @IsOptional()
    contactoTelefono?: string;

    // Opcional: planId si querés que elijan plan al registrarse
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    planId?: string;
}