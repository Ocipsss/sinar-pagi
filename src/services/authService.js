// src/services/authService.js - VERSI SUPABASE AUTH
// Ganti Firebase anonymous auth jadi Supabase Auth

import { supabase } from './supabase.js'

export const initDeviceAuth = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      console.log('[AuthService] Supabase session aktif:', session.user.email || session.user.id)
      return session.user
    }
    // Kalo gak ada session, coba login anon? Supabase gak ada anon default, jadi return null
    // Nanti login operator pake supabase.auth.signInWithPassword di Login.vue
    console.log('[AuthService] Belum ada session Supabase, perlu login operator')
    return null
  } catch (err) {
    console.warn('[AuthService] Gagal cek session:', err.message)
    return null
  }
}

export const signInOperator = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  console.log('[AuthService] Login operator sukses:', data.user.email)
  return data.user
}

export const signUpOperator = async (email, password, operatorData) => {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  // simpen ke table operators dengan auth_id
  if (data.user) {
    await supabase.from('operators').insert({
      id: operatorData.id || crypto.randomUUID(),
      auth_id: data.user.id,
      name: operatorData.name,
      role: operatorData.role || 'KASIR',
      pin: operatorData.pin || '',
      updated_at: new Date().toISOString(),
      synced: 1
    })
  }
  return data.user
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('[AuthService] Logout gagal:', error.message)
  else console.log('[AuthService] Logout sukses')
}

// backward compat biar file lama gak error
export const getCurrentFirebaseUser = getCurrentUser
export const logoutFirebaseDevice = logout
export const initDeviceAuthAlias = initDeviceAuth
