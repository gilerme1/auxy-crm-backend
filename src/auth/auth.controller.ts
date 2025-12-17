/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Public()
    @Post('register')
    @ApiOperation({ summary: 'Registrar nuevo usuario' })
    @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
    @ApiResponse({ status: 409, description: 'Email ya registrado' })
    register(@Body() dto: RegisterDto) {
      return this.authService.register(dto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Iniciar sesión' })
    @ApiResponse({ status: 200, description: 'Login exitoso' })
    @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
    login(@Body() dto: LoginDto) {
      return this.authService.login(dto);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Renovar access token' })
    @ApiResponse({ status: 200, description: 'Token renovado' })
    @ApiResponse({ status: 401, description: 'Refresh token inválido' })
    refreshToken(@Body() dto: RefreshTokenDto) {
      return this.authService.refreshToken(dto.refreshToken);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cerrar sesión' })
    @ApiResponse({ status: 200, description: 'Sesión cerrada' })
    logout(@CurrentUser('sub') userId: string) {
      return this.authService.logout(userId);
    }

    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener usuario actual' })
    @ApiResponse({ status: 200, description: 'Usuario actual' })
    getMe(@CurrentUser('sub') userId: string) {
      return this.authService.getMe(userId);
    }
}
