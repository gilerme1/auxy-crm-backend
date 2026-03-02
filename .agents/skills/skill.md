Skill consolidado para Auxy Agents

Propósito

- Centralizar las directrices de los agentes para evitar dispersión de conocimientos.
- Mantener un único archivo de referencia que guíe diseño, implementación y buenas prácticas.

Formato/Lenguaje

- Lenguaje principal: español; código en TypeScript/Javascript y Bash cuando corresponde.
- Evita caracteres no ASCII salvo que ya existan en el repo; mantener consistencia con el proyecto.

Buenas prácticas y principios de diseño

- Estructura y estilo: seguir patrones de NestJS/Prisma cuando se trate de código relacionado con el backend; vaciar de código experimental en el documento.
- Tipado fuerte: evitar cualquier (any) siempre que sea posible; usar tipos explícitos.
- Idempotencia: las acciones ejecutadas varias veces deben ser seguras; registrar cada intento y resultado.
- Registro y observabilidad: incluir logs y errores con contexto; no exponer datos sensibles en logs.
- Seguridad: no realizar operaciones destructivas sin confirmación explícita; manejar roles/permisos, RBAC, y validaciones de entrada.
- Pruebas: promover pruebas unitarias y de integración para características nuevas; guiarse por TDD cuando aplique.
- Migraciones y base de datos: tratar migraciones como historial de cambios; evitar drift entre DB y migraciones locales; usar prisma migrate deploy en CI/producción y migrate dev en desarrollo.
- Despliegue/Release: evitar despliegues destructivos sin revisión; mantener historial de cambios claro.
- Compatibilidad: mantener compatibilidad hacia atrás cuando sea posible; migraciones no disruptivas primero.

Estrategias para evitar errores comunes

- Registrar y validar siempre la entrada de datos (DTOs, class-validator, class-transformer).
- Verificar permisos de rol antes de cambios sensibles; nunca confiar ciegamente en la entrada del usuario.
- Evitar sobrecargar rutas con lógicas mixtas; mantener responsabilidades claras (Controllers -> Services -> Repositorio).
- Testear rutas críticas (auth, validaciones, flujos de negocio) con pruebas de extremo a extremo cuando sea posible.
- Mantener consistencia en nombres de entidades y relaciones en Prisma (ej. claves foráneas y relaciones por nombre real).

Guía de extensión (cómo añadir un nuevo skill, si fuera necesario)

- Crear una carpeta bajo .agents/skills/<nombre-del-skill>/ y un SKILL.md con el resumen del skill.
- Si se quiere simplificar, se puede mantener un skill.md en la raíz de skills para documentar el conjunto actual y referencias a futuros módulos.
- Mantener el patch history para cambios de skill y evitar divergencias.

Notas finales

- Este documento sirve como guía de alto nivel para el agente; no debe contener secretos ni datos sensibles.
- Si se detectan mejoras relevantes durante el trabajo, añadirlas como nuevas secciones en este mismo archivo o, si corresponde, crear un nuevo skill dedicado siguiendo el formato anterior.

Fin de guía consolidada.
