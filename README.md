<!-- markdownlint-disable MD033 -->
<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
  <p align="center">A progressive<a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
  <p align="center"></p>

# Auxy CRM - Backend API

API REST desarrollada con NestJS, Prisma y PostgreSQL para gestión de asistencia vehicular.

## 🚀 Inicio Rápido

### Prerequisitos

- Node.js 18+
- PostgreSQL 14+
- npm 
- Cloudinary (para almacenamiento de archivos)

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

# Iniciar servidor en desarrollo
npm run start:dev
```

La API estará disponible en `http://localhost:3001/api/v1`
Documentación Swagger: `http://localhost:3001/api/docs`

## 📁 Estructura del Proyecto

```
src/
├── auth/           # Autenticación y autorización
├── common/         # Decoradores, guards, filtros compartidos
├── config/         # Configuración de la aplicación
├── clientes/       # Gestión de clientes
├── prisma/         # Cliente Prisma
├── proveedores/    # Gestión de proveedores
├── solicitudes/    # Gestión de solicitudes de auxilio (core)
├── usuarios/       # Gestión de usuarios con fotos de perfil
├── vehiculos/      # Gestión de vehículos
├── planes/         # Gestión de planes
└── files/          # Servicio de gestión de archivos (Cloudinary)
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
- **CLIENTE_ADMIN**: Gestión de su empresa, vehículos y solicitudes
- **CLIENTE_OPERADOR**: Crear solicitudes, ver vehículos de su empresa
- **PROVEEDOR_ADMIN**: Gestión de su proveedor y operadores
- **PROVEEDOR_OPERADOR**: Crear solicitudes, ver vehículos de su proveedor

## 📊 Endpoints Principales

### Usuarios

```bash
# Crear usuario
POST /api/v1/usuarios
{
  "email": "user@example.com",
  "password": "securePassword123",
  "nombre": "Juan",
  "apellido": "Pérez",
  "telefono": "+598 99 123 456",
  "rol": "CLIENTE_ADMIN",
  "empresaId": "uuid" (opcional)
}

# Listar usuarios (paginado)
GET /api/v1/usuarios?page=1&limit=10

# Obtener usuario
GET /api/v1/usuarios/{id}

# Actualizar usuario
PATCH /api/v1/usuarios/{id}
{
  "nombre": "Juan Carlos",
  "telefono": "+598 99 987 654"
}

# Cambiar contraseña
POST /api/v1/usuarios/{id}/change-password
{
  "oldPassword": "oldPass123",
  "newPassword": "newPass456"
}

# Desactivar/Activar usuario
PATCH /api/v1/usuarios/{id}/toggle-active

# Soft delete (Solo SUPER_ADMIN)
DELETE /api/v1/usuarios/{id}
```

### Fotos de Perfil

```bash
# Subir foto de perfil (máx 3MB, formatos: jpg, jpeg, png, webp)
POST /api/v1/usuarios/{id}/foto-perfil
Content-Type: multipart/form-data
{
  "file": <imagen>
}

Respuesta:
{
  "id": "uuid",
  "email": "user@example.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "fotoPerfil": "https://res.cloudinary.com/...",
  "rol": "CLIENTE_ADMIN"
}

# Eliminar foto de perfil
DELETE /api/v1/usuarios/{id}/foto-perfil
```

### Estado de Disponibilidad (Operadores)

```bash
# Actualizar disponibilidad de operador
PATCH /api/v1/usuarios/{id}/disponibilidad
{
  "estado": "DISPONIBLE",
  "ubicacion": {
    "lat": -34.9011,
    "lng": -56.1645
  }
}

# Estados válidos: DISPONIBLE, NO_DISPONIBLE, EN_SERVICIO
```

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

### Clientes

```bash
# Crear cliente
POST /api/v1/clientes
{
  "razonSocial": "Transportes ABC S.A.",
  "cuit": "21123456789",
  "telefono": "+598 99 123 456",
  "email": "contacto@abc.com",
  "direccion": "Av. Italia 1234",
  "planId": "uuid"
}

# Listar clientes
GET /api/v1/clientes

# Vehículos de empresa
GET /api/v1/clientes/{id}/vehiculos

# Solicitudes de empresa
GET /api/v1/clientes/{id}/solicitudes
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

## 🔧 Servicio de Archivos

El sistema integra **Cloudinary** para almacenamiento de archivos y fotos de perfil.

### Configuración

Asegurar que las siguientes variables de entorno estén configuradas:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Características

- Subida automática a carpetas organizadas por usuario
- Validación de extensiones de archivo (jpg, jpeg, png, webp)
- Límite de tamaño configurable por tipo de archivo
- Eliminación automática de archivos anteriores
- Manejo de errores robusto

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

EXPOSE 3001

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
      CLOUDINARY_CLOUD_NAME: your-cloud-name
      CLOUDINARY_API_KEY: your-api-key
      CLOUDINARY_API_SECRET: your-api-secret
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
JWT_EXPIRES_IN=30m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App
PORT=3001
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

- Desarrollo: <http://localhost:3001/api/docs>
- Producción: <https://api.auxy.com/docs>

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

## 📋 Changelog Reciente

### v1.1.0 - Gestión Avanzada de Usuarios

- ✅ Endpoint de fotos de perfil (subida y eliminación)
- ✅ Control de disponibilidad de operadores con ubicación GPS
- ✅ Soft delete de usuarios
- ✅ Toggle de estado activo/inactivo
- ✅ Cambio de contraseña con validación
- ✅ Integración con Cloudinary para almacenamiento
- ✅ Validaciones mejoradas en DTOs
- ✅ Manejo de errores consistente