# Complif Challenge — Part 2: Desarrollo Base — Checklist Completo

> Source of truth. Cada ítem está basado en el enunciado. Nada inventado.

---

## Tech Stack (decisiones tomadas)

| Categoría                    | Elección                            | Por qué                                                                                                                                                                                         |
| ---------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend framework**        | NestJS                              | Módulos, decoradores, guards, pipes, microservicios HTTP, WebSockets, Swagger auto-generado — todo lo que pide el challenge viene built-in. Express requeriría armar toda esa estructura a mano. |
| **Validación de inputs**     | class-validator + class-transformer | Integración nativa con NestJS vía `ValidationPipe`. Los DTOs se decoran y validan automáticamente. Además Swagger infiere los schemas de los decoradores.                                       |
| **ORM**                      | TypeORM                             | Decoradores y repositorios consistentes con el paradigma NestJS. `migration:generate` crea migraciones automáticas a partir de cambios en entities.                                             |
| **Auth**                     | @nestjs/passport + @nestjs/jwt      | Estándar oficial de NestJS. Guards reutilizables, estrategias JWT listas, documentación directa.                                                                                                |
| **Logging**                  | nestjs-pino + JSON estructurado     | Mantiene logs estructurados en toda la app con integración nativa a NestJS. Cubre el requisito de logging consistente y el evento estructurado de notificaciones.                               |
| **Notificaciones real-time** | SSE (Server-Sent Events)            | El challenge pide notificaciones unidireccionales (server → client al cambiar estado). SSE es exactamente eso, sin la complejidad de WebSockets. NestJS lo soporta nativamente con `@Sse()`.    |
| **Testing unitario**         | Jest                                | NestJS viene preconfigurado con Jest. `@nestjs/testing` da utilidades para crear módulos con DI mockeada.                                                                                       |
| **Testing e2e**              | Jest + Supertest                    | El repo implementa pruebas HTTP de integración para los endpoints principales usando el stack estándar de NestJS, sin agregar infraestructura de browser extra.                                  |
| **Node version**             | node:20-alpine                      | LTS actual, alpine = imágenes Docker chicas.                                                                                                                                                    |

---

## 1. FRONTEND (Next.js)

### 1.1 Dashboard

- [x] Lista de empresas visible en el dashboard
- [x] Empresas se muestran en sus diferentes estados: `pending`, `in_review`, `approved`, `rejected`

### 1.2 Formulario de registro de empresas

- [x] Campo: nombre de la empresa
- [x] Campo: tax ID o identificador fiscal
- [x] Campo: país
- [x] Campo: industria
- [x] Upload de documento: certificado fiscal
- [x] Upload de documento: constancia de inscripción
- [x] Upload de documento: póliza de seguro

### 1.3 Vista de detalle de empresa

- [x] Vista dedicada de detalle por empresa
- [x] Timeline de estados (historial de transiciones)

### 1.4 Notificaciones en tiempo real

- [x] Sistema de notificaciones cuando cambia el estado de una empresa (vía SSE)

### 1.5 Filtros y búsqueda

- [x] Filtro/búsqueda por nombre
- [x] Filtro/búsqueda por estado
- [x] Filtro/búsqueda por país

### 1.6 Bonus UI

- [x] Preview de PDFs subidos (bonus, pero mencionado explícitamente)

---

## 2. BACKEND (NestJS)

### 2.1 API RESTful — Endpoints obligatorios

- [x] `POST` — Crear empresa
- [x] `GET` — Listado de empresas con paginación y filtros
- [x] `GET` — Detalle de una empresa
- [x] `PATCH/PUT` — Cambio de estado de una empresa
- [x] `POST` — Subir un documento asociado a una empresa
- [x] `GET` — Listar documentos (de una empresa)
- [x] `GET/POST` — Calcular score de riesgo de la empresa

### 2.2 Validación automática de riesgo (Risk Score)

- [x] Se calcula al registrar una empresa
- [x] Factor: País (alto riesgo = países sin convenios fiscales)
- [x] Factor: Industria (alto riesgo = construcción, seguridad, casas de cambio, casinos)
- [x] Factor: Documentación completa (falta algún documento = +20 puntos de riesgo)
- [x] Score en rango 0–100
- [x] Score > 70 = requiere revisión manual
- [x] Suposiciones documentadas donde sea necesario

### 2.3 Integración con servicio externo mock (validación de identificadores fiscales)

- [x] Microservicio NestJS separado que valida formato de identificadores fiscales según país (comunicación vía HTTP)
- [x] El backend principal llama a este microservicio
- [x] (Es un mock — no necesita ser una API real externa)

### 2.4 Sistema de notificaciones

- [x] Cuando cambia el estado de una empresa, se envía notificación
- [x] Implementado como: log estructurado JSON + SSE al frontend

### 2.5 Tests

- [x] Tests unitarios de **todos** los endpoints (Jest + @nestjs/testing)

---

## 3. BASE DE DATOS (PostgreSQL)

### 3.1 Tablas obligatorias

- [x] Tabla `businesses` — información de las empresas
- [x] Tabla `documents` — referencias a los documentos subidos
- [x] Tabla `status_history` — historial de estados
- [x] Tabla `users` — para la autenticación

### 3.2 Diagrama

- [x] Diagrama simple del modelo de datos (recomendado, ayuda en la defensa)

### 3.3 Migraciones

- [x] Sistema de migraciones implementado (TypeORM migrations)

### 3.4 Seed data

- [x] Seed con data de ejemplo: mínimo 20 empresas

---

## 4. AUTENTICACIÓN

- [x] JWT authentication implementada (@nestjs/passport + @nestjs/jwt)
- [x] Rol `admin` — puede cambiar estados
- [x] Rol `viewer` — solo lectura
- [x] Guard de autorización (chequea rol en rutas protegidas)
- [x] Endpoint de login
- [x] Endpoint de logout

---

## 5. BONUS TRACK: Infrastructure as Code (Terraform)

> Explícitamente bonus, pero lo listo completo por si se quiere hacer.

- [ ] Vercel para hosting de frontend
- [ ] AWS RDS PostgreSQL instance
- [ ] AWS S3 bucket para documentos
- [ ] AWS ECS para el backend
- [ ] VPC con subnets públicas y privadas
- [ ] Security groups apropiados
- [ ] Archivos `.tf` listos y validados (no hace falta deploy real)

---

## 6. REQUISITOS TÉCNICOS OBLIGATORIOS ("Debe incluir")

- [x] Docker Compose para levantar todo el stack localmente (backend + microservicio de validación + PostgreSQL +
      frontend)
- [x] README con instrucciones claras de setup
- [x] Variables de entorno bien documentadas (`.env.example`)
- [x] Manejo de errores consistente (NestJS exception filters)
- [x] Validación de inputs (class-validator + class-transformer)
- [x] Tests unitarios clave con Jest (ej: cálculo de risk score, validación de documentos)
- [x] Postman / Thunder Client collection con ejemplos de requests
- [x] Archivo `AGENTS.md` explicando la arquitectura para que un AI agent pueda navegar el código
- [x] OpenAPI / Swagger docs (auto-generado con @nestjs/swagger)

---

## 7. NICE TO HAVE (explícitamente listados)

- [ ] GitHub Actions CI pipeline básico
- [x] Logging estructurado con Pino (nestjs-pino)
- [x] Rate limiting en endpoints públicos (@nestjs/throttler)
- [x] SSE para notificaciones real-time (o WebSockets con @nestjs/websockets si se necesita bidireccional)
- [ ] Tests e2e con Playwright

---

## 8. ENTREGABLES

- [ ] Repositorio GitHub/GitLab con código fuente completo
- [x] Docker Compose incluido en el repo
- [x] Colección de Postman incluida en el repo
- [ ] (Opcional) Terraform files en carpeta `/infrastructure`
- [ ] Video de 3–5 minutos (ej: Loom) mostrando:
  - [ ] Demo de la aplicación funcionando
  - [ ] Explicación rápida de la arquitectura
  - [ ] Una feature de la que estés orgulloso

---

## 9. DOCUMENTACIÓN DE DUDAS

- [x] Archivo `QUESTIONS.md` con:
  - [x] Dudas que surgieron durante el desarrollo
  - [x] Decisión tomada para cada duda
  - [x] Razonamiento detrás de cada decisión

---

## Resumen de conteo

| Sección               | Ítems obligatorios                       |
| --------------------- | ---------------------------------------- |
| Frontend              | 12 (+ 1 bonus PDF preview)               |
| Backend endpoints     | 7                                        |
| Risk score            | 7                                        |
| Servicio mock de validación | 2                                  |
| Notificaciones        | 1                                        |
| Tests                 | 1 (todos los endpoints)                  |
| Base de datos         | 4 tablas + migraciones + seed + diagrama |
| Autenticación         | 6                                        |
| Requisitos técnicos   | 9                                        |
| Entregables           | 6                                        |
| QUESTIONS.md          | 1                                        |
| **Total obligatorio** | **~57 ítems**                            |
