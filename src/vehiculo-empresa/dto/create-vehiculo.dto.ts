import { IsString, IsEnum, IsInt, Min, Max, IsUUID, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoVehiculo } from '@prisma/client';

export class CreateVehiculoDto {
    @ApiProperty({ example: 'ABC1234' })
    @IsString()
    @Length(6, 10)
    patente: string;

    @ApiProperty({ example: 'Toyota' })
    @IsString()
    marca: string;

    @ApiProperty({ example: 'Corolla' })
    @IsString()
    modelo: string;

    @ApiProperty({ example: 2020, minimum: 1900, maximum: 2030 })
    @IsInt()
    @Min(1900)
    @Max(2030)
    año: number;

    @ApiProperty({ enum: TipoVehiculo, example: TipoVehiculo.AUTO })
    @IsEnum(TipoVehiculo)
    tipo: TipoVehiculo;

    @ApiProperty({ example: 'uuid-empresa' })
    @IsUUID()
    empresaId: string;
}