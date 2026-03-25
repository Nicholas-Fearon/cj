import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  createInitialDashboardState,
  normalizeDashboardPayload,
} from '@/lib/dashboardData';
import {
  getSupabaseAdminClient,
  isSupabaseServerConfigured,
} from '@/lib/supabaseServer';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({
      source: 'local',
      ...createInitialDashboardState(),
    });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('coach_dashboards')
    .select('dashboard')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: 'Unable to load dashboard from Supabase.' },
      { status: 500 },
    );
  }

  if (!data?.dashboard) {
    return NextResponse.json({
      source: 'supabase',
      ...createInitialDashboardState(),
    });
  }

  return NextResponse.json({
    source: 'supabase',
    ...normalizeDashboardPayload(data.dashboard),
  });
}

export async function PUT(request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 },
    );
  }

  const body = await request.json();
  const payload = normalizeDashboardPayload(body);
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from('coach_dashboards').upsert(
    {
      clerk_user_id: userId,
      dashboard: payload,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'clerk_user_id',
    },
  );

  if (error) {
    return NextResponse.json(
      { error: 'Unable to save dashboard to Supabase.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

