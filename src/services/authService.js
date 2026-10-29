// src/services/authService.js
import { auth } from './firebase.js'
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'

/**
 * Autentikasi otomatis level perangkat (device auth)
 * Memastikan aplikasi terhubung ke akun Firebase agar diizinkan oleh Rules Firestore
 */
export const initDeviceAuth = () => {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('[AuthService] Perangkat terautentikasi Firebase:', user.email)
        resolve(user)
      } else {
        const email = import.meta.env.VITE_FIREBASE_DEVICE_EMAIL
        const password = import.meta.env.VITE_FIREBASE_DEVICE_PASSWORD

        if (email && password) {
          try {
            const creds = await signInWithEmailAndPassword(auth, email, password)
            console.log('[AuthService] Login perangkat Firebase berhasil:', creds.user.email)
            resolve(creds.user)
          } catch (err) {
            console.warn('[AuthService] Gagal login perangkat Firebase (mungkin offline):', err.message)
            resolve(null)
          }
        } else {
          console.warn('[AuthService] VITE_FIREBASE_DEVICE_EMAIL atau VITE_FIREBASE_DEVICE_PASSWORD belum diatur di .env')
          resolve(null)
        }
      }
    })
  })
}

/**
 * Mendapatkan user Firebase yang sedang aktif
 */
export const getCurrentFirebaseUser = () => {
  return auth.currentUser
}

/**
 * Logout dari akun Firebase (jika diperlukan)
 */
export const logoutFirebaseDevice = async () => {
  try {
    await signOut(auth)
    console.log('[AuthService] Perangkat berhasil logout dari Firebase')
  } catch (err) {
    console.error('[AuthService] Gagal logout Firebase:', err.message)
  }
}
