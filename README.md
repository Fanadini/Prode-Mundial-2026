# 🏆 Prode Mundial 2026

Juego de pronósticos para el Mundial 2026, para jugar con amigos.

## Setup (paso a paso)

### 1. Supabase (base de datos + login)
1. Creá una cuenta gratis en [supabase.com](https://supabase.com)
2. Creá un proyecto nuevo
3. Andá a **SQL Editor → New query**, pegá todo el contenido de `database.sql` y ejecutalo (Run)
4. Andá a **Settings → API** y copiá:
   - `Project URL`
   - `anon public key`

### 2. Variables de entorno
Copiá `.env.local.example` a `.env.local` y completá con tus valores de Supabase.

### 3. Correr localmente
```bash
npm install
npm run dev
```
Abrí http://localhost:3000

### 4. Deploy en Vercel
1. Subí este repo a GitHub
2. En [vercel.com](https://vercel.com) → New Project → importá el repo
3. En **Environment Variables** agregá las mismas variables del `.env.local`
4. Deploy ✅

### 5. Hacerte admin
Registrate en la app, después en Supabase → SQL Editor:
```sql
update profiles set is_admin = true where id = 'TU_USER_ID';
```
(El user_id está en Authentication → Users)

## Cómo se juega
- Cada jugador carga sus pronósticos de la fase de grupos + campeón + goleador
- El admin carga los resultados reales desde `/admin`
- Los puntos se calculan automáticamente

## Sistema de puntos
| Etapa | Ganador/empate | Resultado exacto |
|---|---|---|
| Fase de grupos | 1 pt | 3 pts |
| 32avos / 16avos | 2 pts | 5 pts |
| Cuartos / Semis | 3 pts | 6 pts |
| Final | 4 pts | 8 pts |
| Campeón | 10 pts | — |
| Goleador | 5 pts | — |
