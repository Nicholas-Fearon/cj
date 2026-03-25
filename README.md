# Coach Journal

Basketball coaching workspace built with Next.js, Clerk, and Supabase.

## Features

- Team and player management
- Training planning
- Pre-game planning
- In-game live stat tracking
- Post-game reflection
- Coaching journal
- Clerk-authenticated dashboard sync to Supabase

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your env file from [.env.example](/Users/nickfearon/Desktop/cj/.env.example) and fill in:

```bash
cp .env.example .env.local
```

3. Add these values:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

4. Run the SQL in [supabase/schema.sql](/Users/nickfearon/Desktop/cj/supabase/schema.sql) inside your Supabase SQL editor.

## Development

Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- Clerk handles authentication and protects the dashboard API route.
- Supabase stores one dashboard document per Clerk user in `coach_dashboards`.
- Local storage remains as a fallback and backup cache.
- Production verification in this workspace was run with `npx next build --webpack`.
