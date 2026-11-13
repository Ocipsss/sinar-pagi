# DATABASE — Skema Supabase

Dokumen ini adalah **sumber kebenaran** untuk struktur database Supabase yang dipakai Sinar Pagi POS.

> ⚠️ **Kenapa dokumen ini penting:** Jika project Supabase harus di-recreate (pindah akun, region, atau disaster recovery), schema ini bisa dijalankan ulang lewat SQL Editor Supabase untuk memulihkan struktur tabel. Tanpa ini, data JSON backup tidak bisa di-restore karena tabel tujuan belum ada.

## Ringkasan Naming

| Aspek | Lokal (Dexie) | Cloud (Supabase) |
|-------|---------------|------------------|
| Nama field | **camelCase** & snake_case campur | **snake_case** |
| Primary key | `id` (UUID string) | `id` (UUID string) |
| Timestamp | `updatedAt` + `updated_at` | `updated_at` |
| Soft delete | `deleted: true` | `deleted: boolean` |
| Sync flag | `synced: 0 \| 1` (lokal saja) | — (tidak dikirim) |

Mapping lokal ↔ cloud ada di `src/services/sync/mappers.js` (`toSupabaseRowFull` & `normalizePulledRow`). Whitelist kolom per tabel ada di `src/services/sync/schema.js` (`TABLE_COLUMNS`).

**Urutan push (dependency FK)** — dari `TABLE_PUSH_ORDER`:
```

categories → units → settings → operators
→ products → product_packages → services
→ members
→ transactions → transaction_items → digital_transactions
→ cash_accounts → cash_mutations → expenses → debt_payments
→ shopping_list

```

---

## Setup Awal (SQL Editor Supabase)

Jika kamu membuat project Supabase baru dari nol, jalankan blok SQL di bawah **sekaligus** di Supabase Dashboard → **SQL Editor** → **New query** → **Run**.

```sql
-- ============================================================================
-- SINAR PAGI POS - SCHEMA INIT
-- Jalankan sekali di project Supabase baru.
-- ============================================================================

-- ============================================================================
-- 1. MASTER DATA
-- ============================================================================

create table if not exists categories (
  id          text primary key,
  name        varchar not null,
  deleted     bool default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_categories_updated_at on categories (updated_at);

create table if not exists units (
  id          text primary key,
  name        varchar not null unique,
  deleted     bool default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_units_updated_at on units (updated_at);

create table if not exists settings (
  id             text primary key,
  store_name     varchar,
  store_address  text,
  store_phone    varchar,
  receipt_footer text,
  qris_url       text,
  merchant_name  text,
  nmid           text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists idx_settings_updated_at on settings (updated_at);

create table if not exists operators (
  id          text primary key,
  auth_id     text,
  name        varchar not null,
  role        varchar default 'Kasir',
  pin         varchar,
  deleted     bool default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_operators_updated_at on operators (updated_at);

-- ============================================================================
-- 2. PRODUK & VARIAN
-- ============================================================================

create table if not exists products (
  id                 text primary key,
  category_id        text,
  code               varchar,
  name               varchar not null,
  price_modal        numeric not null default 0,
  price_sell         numeric not null default 0,
  qty                int4 default 0,
  stock              int4 default 0,
  unit               varchar,
  min_stock          int4 default 0,
  ideal_stock        int4 default 0,
  purchase_pack_name varchar,
  pack_qty           int4 default 0,
  pack_price         numeric default 0,
  pack_size          int4 default 1,
  image_url          text,
  image_public_id    text,
  is_published       bool default false,
  is_active          bool default true,
  barcode            varchar,
  price_buy          numeric default 0,
  sell_price         numeric default 0,
  deleted            bool default false,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  constraint products_category_id_fkey foreign key (category_id) references categories(id) on delete set null
);
create index if not exists idx_products_updated_at on products (updated_at);
create index if not exists idx_products_category on products (category_id);

create table if not exists product_packages (
  id             text primary key,
  product_id     text not null,
  name           varchar not null,
  multiplier     int4 not null default 1,
  qty_pcs        int4 default 1,
  price_sell     numeric not null default 0,
  "order"        int4 default 0,
  product_id_alt text,
  deleted        bool default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  constraint product_packages_product_id_fkey foreign key (product_id) references products(id) on delete cascade
);
create index if not exists idx_packages_updated_at on product_packages (updated_at);
create index if not exists idx_packages_product on product_packages (product_id);

create table if not exists services (
  id          text primary key,
  name        varchar not null,
  price       numeric default 0,
  category    varchar,
  product_id  text,
  product_ids text[] default '{}',
  deleted     bool default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  constraint services_product_id_fkey foreign key (product_id) references products(id) on delete set null
);
create index if not exists idx_services_updated_at on services (updated_at);

-- ============================================================================
-- 3. MEMBER & PELANGGAN
-- ============================================================================

create table if not exists members (
  id             text primary key,
  name           varchar not null,
  phone          varchar,
  address        text,
  total_spending numeric default 0,
  points         int4 default 0,
  debt           numeric default 0,
  deleted        bool default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists idx_members_updated_at on members (updated_at);

-- ============================================================================
-- 4. TRANSAKSI
-- ============================================================================

create table if not exists transactions (
  id             text primary key,
  invoice_no     varchar,
  date           timestamptz default now(),
  total          numeric not null default 0,
  total_amount   numeric default 0,
  amount_paid    numeric default 0,
  paid_amount    numeric default 0,
  pay_amount     numeric default 0,
  remaining      numeric default 0,
  change         numeric default 0,
  change_amount  numeric default 0,
  payment_method varchar default 'CASH',
  status         varchar default 'paid',
  due_date       timestamptz,
  member_id      text,
  operator_id    text,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  constraint transactions_member_id_fkey foreign key (member_id) references members(id) on delete set null,
  constraint transactions_operator_id_fkey foreign key (operator_id) references operators(id) on delete set null
);
create index if not exists idx_transactions_updated_at on transactions (updated_at);
create index if not exists idx_transactions_date on transactions (date desc);

-- ⚠️ CATATAN PENTING MENGENAI service_id ⚠️
-- Kolom service_id di sini SENGAJA TIDAK DIBERI FK constraint ke tabel services.
-- Aplikasi menggunakan service_id sebagai penanda statis (contoh: 'SERVICE_SEDUH'),
-- bukan sebagai relasi ID. Jika kamu menambahkan FK, push ke Supabase akan gagal
-- dengan error "violates foreign key constraint".
create table if not exists transaction_items (
  id             text primary key,
  transaction_id text not null,
  product_id     text,
  service_id     text, -- <-- TANPA FK CONSTRAINT (lihat catatan di atas)
  product_name   varchar,
  qty            int4 not null default 1,
  price          numeric not null default 0,
  subtotal       numeric not null default 0,
  service_type   varchar,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  constraint transaction_items_transaction_id_fkey foreign key (transaction_id) references transactions(id) on delete cascade,
  constraint transaction_items_product_id_fkey foreign key (product_id) references products(id) on delete set null
);
create index if not exists idx_items_updated_at on transaction_items (updated_at);
create index if not exists idx_items_transaction on transaction_items (transaction_id);

create table if not exists digital_transactions (
  id                    text primary key,
  date                  timestamptz default now(),
  type                  varchar not null,
  provider              varchar,
  nominal               numeric not null default 0,
  admin_fee             numeric default 0,
  admin_payment_method  varchar default 'cash',
  total_received        numeric default 0,
  profit                numeric default 0,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
create index if not exists idx_digital_updated_at on digital_transactions (updated_at);

-- ============================================================================
-- 5. KEUANGAN
-- ============================================================================

create table if not exists cash_accounts (
  id         text primary key,
  name       varchar not null,
  type       varchar not null default 'CASH',
  balance    numeric default 0,
  deleted    bool default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_accounts_updated_at on cash_accounts (updated_at);

create table if not exists cash_mutations (
  id         text primary key,
  account_id text,
  date       timestamptz default now(),
  type       varchar not null,
  amount     numeric not null default 0,
  category   varchar,
  note       text,
  ref_id     text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint cash_mutations_account_id_fkey foreign key (account_id) references cash_accounts(id) on delete cascade
);
create index if not exists idx_mutations_updated_at on cash_mutations (updated_at);
create index if not exists idx_mutations_ref on cash_mutations (ref_id);

create table if not exists expenses (
  id             text primary key,
  date           timestamptz default now(),
  category       varchar not null,
  amount         numeric not null default 0,
  note           text,
  payment_method varchar default 'CASH',
  cash_part      numeric default 0,
  qris_part      numeric default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists idx_expenses_updated_at on expenses (updated_at);

create table if not exists debt_payments (
  id             text primary key,
  transaction_id text,
  member_id      text,
  date           timestamptz default now(),
  amount         numeric not null default 0,
  payment_method varchar default 'CASH',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  constraint debt_payments_member_id_fkey foreign key (member_id) references members(id) on delete cascade
);
create index if not exists idx_debt_pay_updated_at on debt_payments (updated_at);

-- ============================================================================
-- 6. LAIN-LAIN
-- ============================================================================

create table if not exists shopping_list (
  id              text primary key,
  product_id      text,
  is_bought       bool default false,
  category        varchar,
  name            varchar,
  qty             int4 default 0,
  unit            varchar,
  estimated_price numeric default 0,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_shopping_updated_at on shopping_list (updated_at);

-- ============================================================================
-- 7. SEED DEFAULT DATA
-- ============================================================================

-- Akun kas default
insert into cash_accounts (id, name, type, balance)
values
  ('acc_cash', 'Kas Laci (Tunai)', 'CASH', 0),
  ('acc_bank', 'Rekening / QRIS / Wallet', 'BANK', 0)
on conflict (id) do nothing;

-- Settings default
insert into settings (id, store_name, store_address, store_phone, receipt_footer)
values
  ('app_config', 'SINAR PAGI', 'CIHELEUT JL. TALAS UJUNG NO. 38', '089516477760', 'HATUR NUHUN!')
on conflict (id) do nothing;
```

---

Migration / Fix untuk Database yang Sudah Berjalan

Jika kamu sudah memiliki database Supabase yang berjalan dan sebelumnya sempat error karena FK service_id, jalankan perintah ini di SQL Editor Supabase:

```sql
-- Menghapus FK constraint yang salah desain.
-- Ini akan memperbaiki error "violates foreign key constraint" saat sinkronisasi.
alter table transaction_items 
  drop constraint if exists transaction_items_service_id_fkey;
```

---

RLS Policies

Semua tabel menggunakan Row Level Security (RLS) dengan policy permissive (true) karena login aplikasi menggunakan sistem Operator Lokal (bukan Supabase Auth). Aplikasi menggunakan anon key Supabase untuk terhubung.

```sql
-- Aktifkan RLS di semua tabel
alter table categories enable row level security;
alter table products enable row level security;
alter table product_packages enable row level security;
alter table services enable row level security;
alter table units enable row level security;
alter table operators enable row level security;
alter table settings enable row level security;
alter table members enable row level security;
alter table transactions enable row level security;
alter table transaction_items enable row level security;
alter table cash_accounts enable row level security;
alter table cash_mutations enable row level security;
alter table expenses enable row level security;
alter table debt_payments enable row level security;
alter table digital_transactions enable row level security;
alter table shopping_list enable row level security;

-- Berikan akses penuh (ALL) ke anon/public key
-- (Aman selama URL Supabase tidak disebar ke publik & frontend tidak disusupi XSS)
create policy "Allow all access to categories" on categories for all using (true) with check (true);
create policy "Allow all access to products" on products for all using (true) with check (true);
create policy "Allow all access to product_packages" on product_packages for all using (true) with check (true);
create policy "Allow all access to services" on services for all using (true) with check (true);
create policy "Allow all access to units" on units for all using (true) with check (true);
create policy "Allow all access to operators" on operators for all using (true) with check (true);
create policy "Allow all access to settings" on settings for all using (true) with check (true);
create policy "Allow all access to members" on members for all using (true) with check (true);
create policy "Allow all access to transactions" on transactions for all using (true) with check (true);
create policy "Allow all access to transaction_items" on transaction_items for all using (true) with check (true);
create policy "Allow all access to cash_accounts" on cash_accounts for all using (true) with check (true);
create policy "Allow all access to cash_mutations" on cash_mutations for all using (true) with check (true);
create policy "Allow all access to expenses" on expenses for all using (true) with check (true);
create policy "Allow all access to debt_payments" on debt_payments for all using (true) with check (true);
create policy "Allow all access to digital_transactions" on digital_transactions for all using (true) with check (true);
create policy "Allow all access to shopping_list" on shopping_list for all using (true) with check (true);
```

⚠️ Catatan Keamanan: Policy Allow all access sangat permisif. Ini dipilih karena aplikasi Sinar Pagi POS beroperasi sebagai Single-Tenant (satu toko) dan trusted internal tool. Jika ke depannya aplikasi ini akan dipublikasikan secara luas atau menjadi SaaS multi-toko, kamu wajib mengganti policy ini dengan autentikasi Supabase Auth berbasis auth.uid() = user_id.

```
