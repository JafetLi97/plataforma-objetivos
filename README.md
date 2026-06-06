# 🎯 Plataforma de Seguimiento de Objetivos

Aplicación web para dar seguimiento a **objetivos de trabajo**, tanto individuales
como de equipo. Cada objetivo agrupa **tareas** más pequeñas, y tanto objetivos
como tareas avanzan a través de **estados** (Pendiente → En progreso → Completado).
La plataforma es **colaborativa**: cada persona tiene su cuenta, puede crear
equipos e invitar a otras personas, y los miembros comparten los objetivos del equipo.

> **App desplegada:** https://JafetLi97.github.io/plataforma-objetivos/

---

## 1. Alcance cubierto

- ✅ **Cuentas de usuario** (registro e inicio de sesión con email y contraseña).
- ✅ **Objetivos personales y de equipo**, con título, descripción y fecha límite.
- ✅ **Tareas** dentro de cada objetivo.
- ✅ **Máquina de estados** (catálogo en base de datos) aplicada a objetivos y tareas.
- ✅ **Equipos**: crear equipos e **invitar miembros por email**.
- ✅ **Panel central** con el avance (% de tareas completadas) de cada objetivo.
- ✅ **Diseño responsive** (funciona en móvil y escritorio).
- ✅ **Seguridad por filas (RLS)**: cada usuario solo ve y modifica lo suyo y lo de sus equipos.

### Fuera de alcance (decisiones conscientes)

Para priorizar una solución funcional y cuidada en el plazo, se dejaron fuera:

- **Notificaciones por email / en app** al invitar o asignar.
- **Comentarios y archivos adjuntos** en objetivos/tareas.
- **Roles granulares** (solo existen "dueño" y "miembro").
- **Invitación a personas no registradas**: solo se puede invitar a usuarios que
  ya tienen cuenta (se busca por su email). Es la opción más simple y segura sin
  montar un servidor de correo.

---

## 2. Decisiones técnicas principales

| Decisión | Motivo |
|---|---|
| **React + Vite** | Frontend ágil y ligero; build estático ideal para GitHub Pages. |
| **Tailwind CSS** | Interfaz cuidada y responsive sin mantener CSS a mano. |
| **Supabase** (PostgreSQL + Auth) | Aporta base de datos, autenticación y seguridad por filas sin necesidad de programar ni mantener un backend propio. Encaja en el plazo. |
| **GitHub Pages** | Hosting gratuito para el frontend estático. La base de datos vive en Supabase. |
| **HashRouter** | GitHub Pages no soporta el enrutado de una SPA por rutas reales; con `#` recargar nunca da 404. |
| **Estados en una tabla (`statuses`)** | La "máquina de estados" es un catálogo en BD, no valores fijos en el código: se pueden añadir/renombrar estados sin tocar el frontend. |
| **RLS en todas las tablas** | La seguridad se aplica en la base de datos, por eso es seguro publicar la *anon key* en el frontend. |

### Modelo de datos

```
profiles ───< team_members >─── teams
   │                              │
   │                              │
   └──< objectives >──────────────┘   (objective.team_id NULL = personal)
            │
            └──< tasks
statuses ──< objectives.status_id, tasks.status_id   (catálogo de estados)
```

El esquema completo, con comentarios y políticas de seguridad, está en
[`db/schema.sql`](db/schema.sql).

---

## 3. Puesta en marcha local

Requisitos: **Node.js 20+** y una cuenta gratuita de **Supabase**.

1. **Clonar e instalar**
   ```bash
   git clone https://github.com/JafetLi97/plataforma-objetivos.git
   cd plataforma-objetivos
   npm install
   ```

2. **Crear el proyecto en Supabase** ([supabase.com](https://supabase.com) → *New project*).

3. **Crear las tablas**: en Supabase, *SQL Editor* → *New query*, pega el contenido
   de [`db/schema.sql`](db/schema.sql) y pulsa *Run*.

4. **(Recomendado para la demo) Desactivar la confirmación por email**:
   Supabase → *Authentication* → *Sign In / Providers* → *Email* → desactiva
   *Confirm email*. Así el registro permite iniciar sesión al instante.

5. **Configurar variables de entorno**: copia `.env.example` a `.env.local` y
   rellena con los valores de *Project Settings → API*:
   ```
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_public_key
   ```

6. **Arrancar**
   ```bash
   npm run dev
   ```
   Abre la URL que muestra la terminal (normalmente http://localhost:5173).

---

## 4. Despliegue en GitHub Pages

El despliegue es **automático** con GitHub Actions cada vez que haces push a `main`.

1. En `vite.config.js`, `base` debe ser `'/<nombre-del-repo>/'`
   (por defecto `'/plataforma-objetivos/'`).

2. En GitHub: *Settings → Pages → Build and deployment → Source* = **GitHub Actions**.

3. En GitHub: *Settings → Secrets and variables → Actions → pestaña Variables* →
   crea dos **variables de repositorio**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   > Se usan *Variables* (no *Secrets*) porque la *anon key* es pública por diseño;
   > los datos están protegidos por RLS en la base.

4. Haz push a `main`. La pestaña **Actions** mostrará el despliegue y, al terminar,
   la app quedará en `https://JafetLi97.github.io/plataforma-objetivos/`.

---

## 5. Guía rápida de uso

1. **Regístrate** con tu email y contraseña.
2. En **Panel**, crea un **objetivo** (personal o, si ya tienes equipo, de equipo).
3. Entra al objetivo para **añadir tareas** y cambiar su **estado**; la barra de
   progreso se actualiza sola.
4. En **Equipos**, crea un equipo e **invita** a otras personas por su email
   (deben estar registradas). Al crear un objetivo podrás asignarlo a ese equipo,
   y todos los miembros lo verán.

---

## 6. Estructura del proyecto

```
db/schema.sql              Esquema de la base de datos + seguridad (RLS)
.github/workflows/         Despliegue automático a GitHub Pages
src/
  supabaseClient.js        Conexión con Supabase
  contexts/AuthContext.jsx Estado de sesión del usuario
  components/              Layout y componentes de interfaz reutilizables
  pages/
    AuthPage.jsx           Registro e inicio de sesión
    DashboardPage.jsx      Panel central con los objetivos y su avance
    ObjectiveDetailPage.jsx Detalle de un objetivo y gestión de tareas
    TeamsPage.jsx          Gestión de equipos e invitaciones
```

---

## 7. Stack

React · Vite · React Router · Tailwind CSS · Supabase (PostgreSQL + Auth + RLS) · GitHub Pages
