import { createClient } from "@/lib/supabase/server";

/**
 * Utility functions for managing user roles
 */

export async function getUserRole(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_details')
    .select('role')
    .eq('uid', userId)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return data?.role || 'user';
}

export async function setUserRole(userId: string, role: 'admin' | 'staff') {
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_details')
    .update({ role })
    .eq('uid', userId);

  if (error) {
    console.error('Error setting user role:', error);
    return false;
  }

  return true;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

export async function isUser(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'staff' || role === 'admin';
}
