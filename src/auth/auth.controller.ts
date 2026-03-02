/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Post, Body, Get, HttpCode, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisterEmpresaDto } from './dto/register-empresa.dto';
import { RegisterProveedorDto } from './dto/register-proveedor.dto';

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
  @Post('register/empresa')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registro para empresas (crea empresa + CLIENTE_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Usuario y empresa creados exitosamente' })
  registerEmpresa(@Body() dto: RegisterEmpresaDto) {
    return this.authService.registerEmpresa(dto);
  }

  @Public()
  @Post('register/proveedor')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registro para proveedores (crea proveedor + PROVEEDOR_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Usuario y proveedor creados exitosamente' })
  registerProveedor(@Body() dto: RegisterProveedorDto) {
    return this.authService.registerProveedor(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesion' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token' })
  @ApiResponse({ status: 200, description: 'Token renovado' })
  @ApiResponse({ status: 401, description: 'Refresh token invalido' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesion' })
  @ApiResponse({ status: 200, description: 'Sesion cerrada' })
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

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Iniciar sesión con Google (redirige a Google)' })
  @ApiResponse({ status: 302, description: 'Redirige a Google OAuth' })
  googleAuth() {
    // Este endpoint inicia el flujo de OAuth con Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback de Google OAuth' })
  @ApiResponse({ status: 302, description: 'Redirige con tokens' })
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    try {
      const result = await this.authService.validateOrCreateGoogleUser(req.user);

      // Construir URL de redirección al frontend con tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&isNewUser=${result.isNewUser}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/error?message=${error.message}`);
    }
  }

  @Public()
  @Post('google/callback-mobile')
  @ApiOperation({ summary: 'Callback de Google OAuth para mobile' })
  @ApiResponse({ status: 200, description: 'Retorna tokens en JSON' })
  async googleAuthCallbackMobile(@Body() googleProfile: any) {
    // Para aplicaciones mobile que no pueden usar redireccionamientos
    return this.authService.validateOrCreateGoogleUser(googleProfile);
  }
}

