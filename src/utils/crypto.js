// src/utils/crypto.js
// ✅ FIX (3.9): satu sumber untuk hashPin, dipakai operatorRepository & operatorStore

export async function hashPin(pin) {
  if (!pin) return ''
  const str = String(pin)
  // Kalau sudah 64 char hex (sudah ke-hash), jangan di-hash lagi biar tidak double
  if (/^[a-f0-9]{64}$/i.test(str)) return str.toLowerCase()
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback kalau crypto.subtle tidak ada di webview jadul, jangan crash
    return str
  }
}