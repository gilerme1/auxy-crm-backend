import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { EmpresasController } from './empresas.controller';

describe('EmpresasController metadata', () => {
  it('uses /empresas as canonical route', () => {
    const controllerPath = Reflect.getMetadata(PATH_METADATA, EmpresasController);

    expect(controllerPath).toBe('empresas');
  });

  it('declares JwtAuthGuard and RolesGuard at controller level', () => {
    const guards =
      (Reflect.getMetadata(GUARDS_METADATA, EmpresasController) as Array<new (...args: unknown[]) => unknown>) ??
      [];

    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
  });
});

