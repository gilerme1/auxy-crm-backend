import { IsString, IsEmail, IsUUID, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmpresaDto {
    @ApiProperty({ example: 'Transportes ABC S.A.' })
    @IsString()
    razonSocial: string;

    @ApiProperty({ example: '211234567890' })
    @IsString()
    @Length(11, 11, { message: 'CUIT debe tener 11 dígitos' })
    cuit: string;

    @ApiProperty({ example: '+598 99 123 456' })
    @IsString()
    telefono: string;

    @ApiProperty({ example: 'contacto@transportesabc.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Av. Italia 1234, Montevideo' })
    @IsString()
    direccion: string;

    @ApiProperty({ example: 'uuid-plan', required: false })
    @IsOptional()
    @IsUUID()
    planId?: string;
}