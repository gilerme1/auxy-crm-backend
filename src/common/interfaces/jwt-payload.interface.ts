export interface JwtPayload {
  sub: string; // user id
  email: string;
  rol: string;
  empresaId?: string;
  proveedorId?: string;
}

export interface RequestWithUser extends Request {
  user: JwtPayload;
}
