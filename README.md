<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->


# Auxy CRM - Backend API

API REST desarrollada con NestJS, Prisma y PostgreSQL para gestión de asistencia vehicular.

## 🚀 Inicio Rápido

### Prerequisitos
- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-org/auxy-crm-backend.git
cd auxy-crm-backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Crear base de datos y ejecutar migraciones
npx prisma migrate dev

# Ejecutar seed (datos de prueba)
npm run prisma:seed

# Iniciar servidor en desarrollo
npm run start:dev
```

La API estará disponible en `http://localhost:3000/api/v1`
Documentación Swagger: `http://localhost:3000/api/docs`

## 📁 Estructura del Proyecto

```
src/
├── auth/           # Autenticación y autorización
├── common/         # Decoradores, guards, filtros compartidos
├── config/         # Configuración de la aplicación
├── empresas/       # Gestión de empresas
├── prisma/         # Cliente Prisma
├── proveedores/    # Gestión de proveedores
├── solicitudes/    # Gestión de solicitudes de auxilio (core)
├── usuarios/       # Gestión de usuarios
├── vehiculos/      # Gestión de vehículos
└── planes/         # Gestión de planes
```

## 🔐 Autenticación

La API utiliza JWT para autenticación. 

### Login
```bash
POST /api/v1/auth/login
{
  "email": "admin@auxy.com",
  "password": "admin123"
}
```

Respuesta:
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@auxy.com",
    "rol": "SUPER_ADMIN"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Uso del token
Incluir en headers: `Authorization: Bearer {accessToken}`

## 👥 Roles y Permisos

- **SUPER_ADMIN**: Acceso total al sistema
- **ADMIN**: Gestión de su empresa, vehículos y solicitudes
- **OPERATOR**: Crear solicitudes, ver vehículos de su empresa
- **PROVIDER**: Ver y atender solicitudes asignadas

## 📊 Endpoints Principales

### Solicitudes de Auxilio

```bash
# Crear solicitud
POST /api/v1/solicitudes
{
  "tipo": "GRUA",
  "prioridad": "ALTA",
  "vehiculoId": "uuid",
  "latitud": -34.9011,
  "longitud": -56.1645,
  "direccion": "Av. 18 de Julio 1234",
  "observaciones": "Vehículo no arranca"
}

# Listar solicitudes (con filtros)
GET /api/v1/solicitudes?estado=PENDIENTE&page=1&limit=10

# Asignar a proveedor
POST /api/v1/solicitudes/{id}/asignar
{
  "proveedorId": "uuid"
}

# Cambiar estado
PATCH /api/v1/solicitudes/{id}/estado
{
  "estado": "EN_CAMINO"
}

# Finalizar servicio
POST /api/v1/solicitudes/{id}/finalizar
{
  "costoFinal": 2500,
  "observaciones": "Servicio completado"
}

# Calificar servicio
POST /api/v1/solicitudes/{id}/calificar
{
  "calificacion": 5,
  "comentario": "Excelente servicio"
}
```

### Empresas

```bash
# Crear empresa
POST /api/v1/empresas
{
  "razonSocial": "Transportes ABC S.A.",
  "cuit": "21123456789",
  "telefono": "+598 99 123 456",
  "email": "contacto@abc.com",
  "direccion": "Av. Italia 1234",
  "planId": "uuid"
}

# Listar empresas
GET /api/v1/empresas

# Vehículos de empresa
GET /api/v1/empresas/{id}/vehiculos

# Solicitudes de empresa
GET /api/v1/empresas/{id}/solicitudes
```

### Vehículos

```bash
# Crear vehículo
POST /api/v1/vehiculos
{
  "patente": "ABC1234",
  "marca": "Toyota",
  "modelo": "Corolla",
  "año": 2020,
  "tipo": "AUTO",
  "empresaId": "uuid"
}

# Historial de auxilios
GET /api/v1/vehiculos/{id}/historial
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## 🚀 Deployment

### Producción

```bash
# Build
npm run build

# Ejecutar migraciones
npx prisma migrate deploy

# Iniciar servidor
npm run start:prod
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: auxy
      POSTGRES_PASSWORD: auxy123
      POSTGRES_DB: auxy_crm
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://auxy:auxy123@postgres:5432/auxy_crm
      JWT_SECRET: your-secret-key
      JWT_REFRESH_SECRET: your-refresh-secret
    depends_on:
      - postgres

volumes:
  postgres_data:
```

## 📝 Variables de Entorno

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/auxy_crm

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://app.auxy.com
```

## 🔧 Comandos Útiles

```bash
# Prisma
npx prisma studio              # GUI para ver la BD
npx prisma migrate dev         # Crear nueva migración
npx prisma migrate reset       # Reset BD (cuidado!)
npx prisma generate            # Regenerar cliente

# NestJS
nest g module nombre           # Crear módulo
nest g controller nombre       # Crear controller
nest g service nombre          # Crear service
```

## 📚 Documentación API

La documentación completa de la API está disponible en:
- Desarrollo: http://localhost:3000/api/docs
- Producción: https://api.auxy.com/docs

## 🐛 Debugging

Para debugging con VSCode, crear `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:dev"],
      "console": "integratedTerminal"
    }
  ]
}
```