# BUENOS AIRES, ARGENTINA

# Challenge Técnico Software Engineering - Onboarding de

# empresas

## Contexto

Complif es una plataforma que automatiza procesos de compliance para entidades financieras, y nuestra visión
es ser la plataforma líder de la industria en el continente. Somos una startup en rápido crecimiento que
trabaja con bancos, fintechs y la industria financiera tradicional, y estamos en proceso de expandirnos
internacionalmente. Actualmente Complif ofrece una solución (B2B2B) de onboarding digital para empresas y
cuenta con dos aplicaciones principales: ● Portal de Usuario: un formulario web whitelabel personalizado con
el look & feel de nuestro cliente (el banco o entidad financiera que nos contrata) para que el cliente final
(cliente del banco) complete su información y suba la documentación requerida. ● Plataforma Complif: una web
tipo administrador/backoffice interna para que los analistas del banco gestionen las solicitudes de apertura,
calculen el riesgo del cliente y hagan el cruce de listas terroristas, entre otras automatizaciones de
compliance. Complif necesita poder hacer el onboarding de empresas (KYB) donde automatizamos la validación de
documentación legal/fiscal y cálculo de riesgo. ¡Los ejercicios son difíciles! Podés usar AI o cualquier otra
herramienta que te sirva de ayuda. Recordá que nos interesa más ver tu razonamiento y qué
entendiste/aprendiste más allá del contenido de la solución. En la próxima instancia vamos a revisar en vivo
las respuestas que entregues.

## Parte 1: Modelo de datos

**1) Modelo de datos y lógicas de negocio:** Complif desea incorporar un nuevo módulo de firma electrónica en
su plataforma. El mismo debe contar con las siguientes características: ● Registro de esquema de firmantes
(SIGNATURE_SCHEMA) por cuenta (ACCOUNT)**.** ● Incluir facultades (FACULTIES) estandarizadas. Una facultad es
un permiso para realizar una determinada acción en el contexto de una empresa. Ejemplos: ○ CREATE_WIRE ○
APPROVE_WIRE ○ REQUEST_LOAN ○ MODIFY_CONTACT_INFO ○ etc ● Soportar la creación de grupos de firmantes
(GROUPS). Ejemplos: grupo A, grupo B, grupo C, etc. ● Soportar la configuración de reglas de firma (RULES) por
grupos y facultades. Por ejemplo: ○ Para solicitar un préstamo (REQUEST_LOAN) se requieren (1 firmante del
grupo A) o (2 firmantes del grupo B) o (1 firmante del grupo B y 2 firmantes del grupo C) ○ Para aprobar una
transferencia (APPROVE_WIRE) se requieren (3 firmantes del grupo A) o (1 firmante del grupo A y 1 firmante del
grupo B y 2 firmantes del grupo C) ○ Etc ● Soportar la creación de solicitud de firma (SIGNATURE_REQUEST),
vinculado a una cuenta y a una facultad requerida para ese documento. Por ejemplo: “Nueva solicitud de
documento de firma para la cuenta 10001 de Complif Inc. de aprobación de transferencia (APPROVE_WIRE)”. ●
Registro de las combinatorias (COMBINATIONS) posibles para cada solicitud de firma. ● Contar con trazabilidad
de los diferentes estados relacionados a una solicitud de firma y cada uno de los firmantes (quién firmó,
quién falta, combinatorias posibles, etc). © Celeri Tecnología SRL - La información contenida en este
documento es estrictamente confidencial y está

## Parte 2: Desarrollo Base

Vas a construir un **Portal de Onboarding de Empresas** que van a utilizar usuarios internos de la herramienta
para poder cargar manualmente datos básicos de empresas con su respectiva documentación. Para simplificar el
ejercicio, no te pedimos que realices un portal separado para que un usuario externo (dueño o representante de
esa empresa) pueda crear proactivamente a la empresa.

### Funcionalidades Core

#### 1. Frontend (Next.js)

- Dashboard con lista de empresas en diferentes estados (pending, in_review, approved, rejected)
- Formulario de registro de empresas con:
  - Datos básicos (nombre, CUIT o identificador fiscal, país, industria)
  - Upload de documentos (certificado fiscal, constancia de inscripción, póliza de seguro)
- Vista de detalle de la empresa con timeline de estados
- Sistema de notificaciones en tiempo real (cuando cambia el estado)
- Filtros y búsqueda por nombre, estado, país
- **Bonus (UI)** : Implementar preview de PDFs subidos Podés sumar cualquier funcionalidad que consideres que
  mejora la experiencia de usuario.

#### 2. Backend (NestJS o Node.js + Express)

- API RESTful con los siguientes endpoints:
  - Crear empresa
  - Listado de empresas con paginación y filtros
  - Detalle de una empresa
  - Cambio de estado de una empresa
  - Subir un documento asociado a una empresa
  - Listar documentos
  - Calcular score de riesgo de la empresa
- **Validación automática de riesgo** : Al registrar una empresa, el sistema debe calcular un "risk score"
  basado en: - País (alto riesgo: países sin convenios fiscales) - Industria (alto riesgo: construcción,
  seguridad, casas de cambio, casinos) - Documentación completa (falta algún documento = +20 puntos de
  riesgo) - Score de 0-100 donde >70 = requiere revisión manual © Celeri Tecnología SRL - La información
  contenida en este documento es estrictamente confidencial y está

- Tomar las suposiciones que sean necesarias
- **Integración con servicio externo mock** : Simular llamada a API de validación de CUIT/RFC
- Crear un microservicio separado simple que valide formato
- El backend principal debe llamar a este servicio
- **Sistema de notificaciones** : Cuando cambia el estado, enviar notificación (puede ser simplemente un log
  estructurado o webhook mock) **- Tests unitarios de todos los endpoints**

#### 3. Base de Datos (PostgreSQL)

- Diseñar esquema relacional con al menos las siguientes tablas: businesses (información de las empresas),
  documents (referencias a los documentos subidos), status_history (historial de estados), users (para la
  autenticación).
- Te recomendamos hacer un diagrama muy simple del modelo de datos. Nos ayuda a entender cómo lo pensaste y va
  a ser útil para la defensa.
- Implementar algún sistema de migraciones para implementar cambios en el modelo de datos.
- Seed con data de ejemplo (al menos 20 empresas)

#### 4. Autenticación

- JWT authentication
- Roles: admin (puede cambiar estados), viewer (solo lectura)
- Middleware de autorización
- Login/logout endpoints

#### 5. Bonus Track: Infrastructure as Code (Terraform)

- Vercel para hosting de frontend
- Configurar infraestructura básica de AWS:
  - RDS PostgreSQL instance
  - S3 bucket para documentos
  - EC2 o ECS para el backend
  - VPC con subnets públicas y privadas
  - Security groups apropiados
- **No es necesario deployar realmente** , solo tener los archivos .tf listos y validados © Celeri Tecnología
  SRL - La información contenida en este documento es estrictamente confidencial y está

## Requisitos Técnicos

### Debe incluir:

- Docker Compose para levantar todo el stack localmente
- README con instrucciones claras de setup
- Variables de entorno bien documentadas (.env.example)
- Manejo de errores consistente
- Validación de inputs (usar class-validator o zod)
- Tests unitarios clave (ej: cálculo de risk score, validación de documentos)
- Postman/Thunder Client collection con ejemplos de requests
- Archivo AGENTS.md explicando la arquitectura para que un AI agent pueda navegar el código
- OpenAPI/Swagger docs (bonus si es auto-generado)

### Nice to have:

- GitHub Actions CI pipeline básico
- Logging estructurado (Winston o Pino)
- Rate limiting en endpoints públicos
- Websockets para notificaciones real-time
- Tests e2e con Playwright o Cypress

## Entregables

1. **Repositorio GitHub/Gitlab** con código fuente completo, docker compose, colección de Postman y (opcional)
   terraform files en carpeta /infrastructure.
2. **Video de 3-5 minutos** (por ej. Loom) mostrando:
   - Demo de la aplicación funcionando
   - Explicación rápida de la arquitectura
   - Una feature que estés orgulloso de haber implementado

## Preguntas

Si tenés dudas durante el desarrollo:

1. Documentalas en un archivo QUESTIONS.md
2. Tomá la decisión que más sentido te haga
3. Explicá tu razonamiento en el archivo **No hay respuestas malas si están bien justificadas!** © Celeri
   Tecnología SRL - La información contenida en este documento es estrictamente confidencial y está
