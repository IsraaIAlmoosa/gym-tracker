'use server';

import { createClient } from '@/lib/supabase/server';

export type ActivityType = 'yoga' | 'pilates' | 'tai_chi' | 'walking' | 'other';

type SaveActivitySessionInput = {
  activityType: ActivityType;
  customActivityName: string | null;
  durationMinutes: number;
  sessionDate: string; // YYYY-MM-DD
  notes: string | null;
};

type SaveActivitySessionResult = { success: true } | { success: false; error: string };

export async function saveActivitySession(
  input: SaveActivitySessionInput
): Promise<SaveActivitySessionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase.from('activity_sessions').insert({
    activity_type: input.activityType,
    custom_activity_name: input.customActivityName,
    duration_minutes: input.durationMinutes,
    session_date: input.sessionDate,
    notes: input.notes,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateActivitySession(
  id: string,
  input: SaveActivitySessionInput
): Promise<SaveActivitySessionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase
    .from('activity_sessions')
    .update({
      activity_type: input.activityType,
      custom_activity_name: input.customActivityName,
      duration_minutes: input.durationMinutes,
      session_date: input.sessionDate,
      notes: input.notes,
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteActivitySession(id: string): Promise<SaveActivitySessionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase.from('activity_sessions').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
