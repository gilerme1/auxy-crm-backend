export class GoogleOAuthDto {
  email: string;
  nombre: string;
  apellido: string;
  fotoPerfil?: string;
  googleId: string;
  accessToken: string;
  refreshToken?: string;
}
