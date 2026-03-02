# Guía de Testing - Módulo Files con Cloudinary

## 🧪 Pruebas Manuales

### Prerequisitos
- NestJS dev server corriendo: `npm run start:dev`
- Token JWT válido obtenido de endpoint `/auth/login`
- Postman o similar para hacer requests HTTP

---

## 📸 Tests - Upload de Fotos en Solicitudes

### 1. Crear una Solicitud
```http
POST /solicitudes
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "tipo": "GRUA",
  "prioridad": "ALTA",
  "vehiculoId": "uuid-vehiculo-1",
  "latitud": -34.9011,
  "longitud": -56.1645,
  "direccion": "Av. 18 de Julio 1234, Montevideo",
  "observaciones": "Vehículo no arranca"
}
```

### 2. Subir Fotos a Solicitud
```http
POST /solicitudes/{solicitudId}/fotos
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

files: [file1.jpg, file2.jpg, file3.jpg]
```

**Respuesta exitosa (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "fotos": [
    "https://res.cloudinary.com/cloud/image/upload/v1234567890/auxy/solicitudes/550e8400-e29b-41d4-a716-446655440000/abc123.jpg",
    "https://res.cloudinary.com/cloud/image/upload/v1234567890/auxy/solicitudes/550e8400-e29b-41d4-a716-446655440000/def456.jpg"
  ],
  "estado": "PENDIENTE",
  "tipo": "GRUA",
  ...
}
```

### 3. Verificar Fotos Subidas
```http
GET /solicitudes/{solicitudId}
Authorization: Bearer YOUR_TOKEN
```

Debe mostrar el array `fotos` con las URLs de Cloudinary.

### 4. Eliminar una Foto
```http
DELETE /solicitudes/{solicitudId}/fotos
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "fotoUrl": "https://res.cloudinary.com/cloud/image/upload/v1234567890/auxy/solicitudes/550e8400-e29b-41d4-a716-446655440000/abc123.jpg"
}
```

**Respuesta exitosa (204):**
```
Sin contenido - Solo headers
```

---

## 👤 Tests - Foto de Perfil de Usuario

### 1. Obtener Datos del Usuario Actual
```http
GET /usuarios/{userId}
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "id": "userId",
  "email": "usuario@example.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "fotoPerfil": null,  // Inicialmente sin foto
  "rol": "CLIENTE_OPERADOR"
}
```

### 2. Subir Foto de Perfil
```http
POST /usuarios/{userId}/foto-perfil
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

file: profile_image.jpg
```

**Respuesta exitosa (201):**
```json
{
  "id": "userId",
  "email": "usuario@example.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "fotoPerfil": "https://res.cloudinary.com/cloud/image/upload/v1234567890/auxy/usuarios/userId/profile_image_xyz123.jpg",
  "rol": "CLIENTE_OPERADOR"
}
```

### 3. Actualizar Foto de Perfil (Reemplazar)
Hacer POST nuevamente con archivo diferente:
```http
POST /usuarios/{userId}/foto-perfil
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

file: new_profile_photo.jpg
```

La foto anterior se elimina automáticamente de Cloudinary.

### 4. Eliminar Foto de Perfil
```http
DELETE /usuarios/{userId}/foto-perfil
Authorization: Bearer YOUR_TOKEN
```

**Respuesta exitosa (204):**
```
Sin contenido
```

Después, `fotoPerfil` será `null`.

---

## ❌ Casos de Error

### 1. Archivo Muy Grande
```http
POST /usuarios/{userId}/foto-perfil
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

file: huge_file_100MB.jpg
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": "Archivo demasiado grande. Máximo: 3MB",
  "error": "Bad Request"
}
```

### 2. Tipo de Archivo No Permitido
```http
POST /usuarios/{userId}/foto-perfil
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

file: document.exe
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": "Tipo de archivo no permitido. Permitidos: jpg, jpeg, png, webp",
  "error": "Bad Request"
}
```

### 3. Solicitud o Usuario No Encontrado
```http
POST /solicitudes/non-existent-id/fotos
Authorization: Bearer YOUR_TOKEN
```

**Response (404):**
```json
{
  "statusCode": 404,
  "message": "Solicitud con ID non-existent-id no encontrada",
  "error": "Not Found"
}
```

### 4. Usuario Intentando Acceder a Foto Ajena
```http
POST /usuarios/other-user-id/foto-perfil
Authorization: Bearer YOUR_TOKEN  // Tu token
```

**Response (401):**
```json
{
  "statusCode": 401,
  "message": "Solo puedes actualizar tu propia foto de perfil",
  "error": "Unauthorized"
}
```

### 5. Eliminar Foto que No Existe
```http
DELETE /usuarios/{userId}/foto-perfil
Authorization: Bearer YOUR_TOKEN
// Cuando ya no tiene foto
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": "El usuario no tiene foto de perfil",
  "error": "Bad Request"
}
```

---

## 🔐 Tests de Control de Acceso

### 1. Intentar Upload sin Autenticación
```http
POST /solicitudes/{solicitudId}/fotos
Content-Type: multipart/form-data

files: [image.jpg]
```

**Response (401):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 2. Usuario con Rol Incorrecto
Usuario con rol `PROVEEDOR_ADMIN` intentando subir fotos a solicitud de cliente:

```http
POST /solicitudes/{solicitudId}/fotos
Authorization: Bearer PROVEEDOR_ADMIN_TOKEN
```

**Response (403):**
```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

---

## 📊 Tests de Carga

### Script Bash para Test de Múltiples Uploads

```bash
#!/bin/bash

TOKEN="your_jwt_token"
SOLICITUD_ID="uuid-1234"
BASE_URL="http://localhost:3000"

# Crear 5 fotos de prueba
for i in {1..5}; do
  # Crear imagen simple con ImageMagick
  convert -size 100x100 xc:blue test_image_$i.jpg
done

# Upload múltiple
curl -X POST "$BASE_URL/solicitudes/$SOLICITUD_ID/fotos" \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@test_image_1.jpg" \
  -F "files=@test_image_2.jpg" \
  -F "files=@test_image_3.jpg" \
  -F "files=@test_image_4.jpg" \
  -F "files=@test_image_5.jpg"

# Limpiar
rm test_image_*.jpg
```

---

## 🎯 Checklist de Validación

- [ ] Upload de 1 foto funciona
- [ ] Upload de múltiples fotos funciona
- [ ] Fotos se guardan en Cloudinary
- [ ] URLs son válidas y accesibles
- [ ] Foto anterior se elimina automáticamente
- [ ] Eliminación de foto actualiza BD
- [ ] Control de acceso RBAC funciona
- [ ] Validación de tamaño funciona
- [ ] Validación de tipo funciona
- [ ] Errores se loguean correctamente
- [ ] Timestamps se actualizam (updatedAt)

---

## 🐛 Debugging

### Ver Logs de Cloudinary
```typescript
// Agregar en FilesService
this.logger.debug('Upload iniciado', { folder, file: file.originalname });
this.logger.debug('Upload completado', { publicId: result.public_id, url: result.secure_url });
```

### Verificar en DB
```sql
-- PostgreSQL
SELECT id, email, fotoPerfil FROM usuarios WHERE fotoPerfil IS NOT NULL;
SELECT id, fotos FROM solicitudes_auxilio WHERE fotos != '{}';
```

### Verificar en Cloudinary Dashboard
1. Ir a: https://console.cloudinary.com/
2. Media Library → Buscar carpeta `auxy/`
3. Verificar que archivos están organizados correctamente

---

## 📝 Notas

- **Cloudinary caching**: Las URLs pueden estar cacheadas por 24h
- **Public IDs únicos**: Cloudinary genera IDs únicos automáticamente
- **Transformaciones**: Agregar `?w=200&h=200&c=fill` a URLs para thumbnails
- **Reintentos**: Si falla, implementar retry logic con exponential backoff
- **Monitoreo**: Agregar alertas si tasa de error > 5%
