// src/services/supabase.js - pengganti firebase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !String(supabaseUrl).includes('your-project') &&      // sisa dari .env.example
  !String(supabaseKey).includes('your-anon-key')
)

if (!isConfigured) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum di-set. ' +
    'Aplikasi akan berjalan dalam MODE LOKAL (tanpa cloud). ' +
    'Fitur sync/backup/cloud akan nonaktif sampai .env diisi dan app di-reload.'
  )
}

// ✅ Stub client: mengembalikan response "gagal" tanpa throw.
// Bentuk response menyerupai Supabase PostgrestResponse / StorageResponse
// supaya caller yang sudah punya `if (error) throw error` tetap aman.
const createStubSupabase = () => {
  const notConfiguredError = {
    message: 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di .env',
    code: 'SUPABASE_NOT_CONFIGURED'
  }

  // Chainable query builder palsu: from(...).select(...).eq(...).gt(...).limit(...)
  const createQueryBuilder = () => {
    const resultPromise = Promise.resolve({ data: null, error: notConfiguredError })

    // setiap method chain mengembalikan builder yang sama, tapi juga thenable
    const builder = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      upsert: () => builder,
      delete: () => builder,
      eq: () => builder,
      neq: () => builder,
      gt: () => builder,
      gte: () => builder,
      lt: () => builder,
      lte: () => builder,
      is: () => builder,
      in: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => resultPromise,
      single: () => resultPromise,
      then: (resolve, reject) => resultPromise.then(resolve, reject),
      catch: (reject) => resultPromise.catch(reject)
    }
    return builder
  }

  const stubChannel = {
    on: () => stubChannel,
    subscribe: () => stubChannel,
    unsubscribe: () => {}
  }

  return {
    __isStub: true,          // penanda untuk caller yang ingin cek
    __error: notConfiguredError,

    from: () => createQueryBuilder(),

    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: notConfiguredError }),
      signUp: async () => ({ data: null, error: notConfiguredError }),
      signOut: async () => ({ error: null })
    },

    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: notConfiguredError }),
        download: async () => ({ data: null, error: notConfiguredError }),
        list: async () => ({ data: [], error: notConfiguredError }),
        remove: async () => ({ data: null, error: notConfiguredError })
      })
    },

    channel: () => stubChannel,
    removeChannel: () => {}
  }
}

// ✅ Tidak pernah throw — app tetap bisa boot dalam mode lokal
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : createStubSupabase()

// Helper untuk caller yang butuh cek apakah cloud tersedia
export const isSupabaseConfigured = () => isConfigured