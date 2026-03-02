AGENTS.md - Auxy B2B Project Context

1. Propósito del Proyecto
Auxy es una plataforma B2B que conecta empresas con proveedores de servicios de auxilio mecánico. 
El sistema gestiona la logística de asistencia, asignación de proveedores y administración de flotas en tiempo real.

2. Stack Tecnológico Principal (Tech Stack)
Backend Core
Framework: NestJS (Node.js) con TypeScript.
Arquitectura: Modular (Pattern-driven). Se prioriza la separación de intereses entre Controllers, Services y Modules.
Base de Datos: PostgreSQL.
ORM: Prisma (Schema-first).
Seguridad y Autenticación
Estrategia: JWT (@nestjs/jwt + passport-jwt).
Hashing: bcrypt para almacenamiento de credenciales.
OAuth: Implementación activa de Google OAuth 2.0 (passport-google-oauth20).
Sesiones: Sistema de Refresh Tokens para renovación de acceso.

3. Reglas de Desarrollo y Estándares (Skills & Rules)
A. Gestión de Base de Datos (Prisma)
No modificar la DB manualmente: Todas las alteraciones deben realizarse a través de prisma/schema.prisma y ejecutarse con npx prisma migrate dev.

Tipado: Utilizar siempre los tipos generados por @prisma/client.

B. Seguridad y Autorización (Guards)
El sistema utiliza un RBAC (Role-Based Access Control) estricto. 
La IA debe verificar siempre la presencia de decoradores de roles en todos los endpoints que requieren autorización.

Roles: SUPER_ADMIN, CLIENTE_ADMIN, PROVEEDOR_ADMIN, CLIENTE_OPERADOR, PROVEEDOR_OPERADOR.

Implementación: Uso obligatorio de Guards personalizados para proteger rutas según el rol del usuario.

C. Estructura de Código
Validación: Uso de class-validator y class-transformer en todos los DTOs.

Manejo de Errores: Implementar filtros de excepción globales para respuestas consistentes.

Inyección de Dependencias: Seguir el patrón nativo de NestJS; evitar el uso de new Class() para servicios.

4. Referencias de Contexto (External Tools)
Para mejorar la calidad de las sugerencias, referenciar los siguientes estándares:

API Docs: Swagger (disponible en /api/docs en desarrollo).
En los controladores de NestJS, incluye siempre decoradores de @nestjs/swagger (@ApiTags, @ApiOperation).

Patrones: API Design Principles para mantener la consistencia en los recursos REST.

Prisma Docs: Prisma Best Practices.

NestJS Docs: https://docs.nestjs.com/

5. Instrucciones para la IA
Cuando generes código para Auxy, prioriza la legibilidad y el tipado fuerte de TypeScript, evita el uso de 'any'.