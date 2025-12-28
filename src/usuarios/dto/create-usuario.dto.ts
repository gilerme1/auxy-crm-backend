import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class CreateUsuarioDto {
    @ApiProperty({ example: 'usuario@ejemplo.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123', minLength: 6 })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'Juan' })
    @IsString()
    nombre: string;

    @ApiProperty({ example: 'Pérez' })
    @IsString()
    apellido: string;

    @ApiProperty({ example: '+598 99 123 456', required: false })
    @IsOptional()
    @IsString()
    telefono?: string;

    @ApiProperty({ enum: RolUsuario, example: RolUsuario.CLIENTE_ADMIN })
    @IsEnum(RolUsuario)
    rol: RolUsuario;

    @ApiProperty({ example: 'uuid-empresa', required: false })
    @IsOptional()
    @IsString()
    empresaId?: string;

    @ApiProperty({ example: 'uuid-proveedor', required: false })
    @IsOptional()
    @IsString()
    proveedorId?: string;
}