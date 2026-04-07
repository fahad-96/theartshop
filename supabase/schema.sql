create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  phone text not null default '',
  landmark text not null default '',
  address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_ref text unique not null,
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  status text not null default 'Placed',
  items jsonb not null default '[]'::jsonb,
  shipping jsonb not null default '{}'::jsonb,
  payment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  image_path text not null default '',
  image_url text not null default '',
  image_gallery jsonb not null default '[]'::jsonb,
  category text not null default 'Art',
  info text not null default '',
  short_info text not null default '',
  pricing jsonb not null default '{"S":599,"L":999,"XL":1499}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  publish_status text not null default 'published' check (publish_status in ('draft', 'published')),
  average_rating numeric(2,1) not null default 0,
  total_reviews integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists image_path text not null default '';
alter table public.products add column if not exists image_url text not null default '';
alter table public.products add column if not exists image_gallery jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists category text not null default 'Art';
alter table public.products add column if not exists info text not null default '';
alter table public.products add column if not exists short_info text not null default '';
alter table public.products add column if not exists pricing jsonb not null default '{"S":599,"L":999,"XL":1499}'::jsonb;
alter table public.products add column if not exists sort_order integer not null default 0;
alter table public.products add column if not exists is_active boolean not null default true;
alter table public.products add column if not exists publish_status text not null default 'published';
alter table public.products add column if not exists average_rating numeric(2,1) not null default 0;
alter table public.products add column if not exists total_reviews integer not null default 0;
alter table public.products add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.products add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_publish_status_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_publish_status_check
      check (publish_status in ('draft', 'published'));
  end if;
end $$;

create table if not exists public.inventory_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  stock_count integer not null default 0,
  reserved_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, size)
);

create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  title text not null default '',
  review_text text not null default '',
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  helpful_count integer not null default 0,
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_reviews add column if not exists review_status text not null default 'pending';

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text not null default '',
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(8,2) not null,
  minimum_purchase numeric(12,2) not null default 0,
  max_uses integer,
  current_uses integer not null default 0,
  active boolean not null default true,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.shopping_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, product_id, size)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and active = true
  );
$$;

grant execute on function public.is_admin_user() to authenticated;

create or replace function public.update_product_rating()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.products
  set
    average_rating = coalesce((
      select round(avg(rating)::numeric, 1)
      from public.customer_reviews
      where product_id = new.product_id
    ), 0),
    total_reviews = (
      select count(*)
      from public.customer_reviews
      where product_id = new.product_id
    ),
    updated_at = now()
  where id = new.product_id;
  return new;
end;
$$;

create or replace function public.delete_own_account(delete_password text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  has_blocking_orders boolean;
  stored_hash text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(length(trim(delete_password)), 0) = 0 then
    raise exception 'Password is required.';
  end if;

  select encrypted_password
  into stored_hash
  from auth.users
  where id = auth.uid();

  if stored_hash is null then
    raise exception 'Password verification failed.';
  end if;

  if extensions.crypt(delete_password, stored_hash) <> stored_hash then
    raise exception 'Password is incorrect.';
  end if;

  select exists (
    select 1
    from public.orders
    where user_id = auth.uid()
      and lower(status) in ('placed', 'processing', 'pending')
  ) into has_blocking_orders;

  if has_blocking_orders then
    raise exception 'Account deletion is blocked because you have pending orders.';
  end if;

  delete from auth.users where id = auth.uid();
  return true;
end;
$$;

grant execute on function public.delete_own_account(text) to authenticated;

drop trigger if exists trg_update_product_rating on public.customer_reviews;
create trigger trg_update_product_rating
after insert or update or delete on public.customer_reviews
for each row
execute function public.update_product_rating();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.products enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "Profiles are visible to their owner" on public.profiles;
create policy "Profiles are visible to their owner"
  on public.profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Profiles can be inserted by their owner" on public.profiles;
create policy "Profiles can be inserted by their owner"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Profiles can be updated by their owner" on public.profiles;
create policy "Profiles can be updated by their owner"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Orders are visible to their owner" on public.orders;
create policy "Orders are visible to their owner"
  on public.orders
  for select
  using (auth.uid() = user_id);

drop policy if exists "Orders can be inserted by their owner" on public.orders;
create policy "Orders can be inserted by their owner"
  on public.orders
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admins can view all orders" on public.orders;
create policy "Admins can view all orders"
  on public.orders
  for select
  using (public.is_admin_user());

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
  on public.orders
  for update
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Everyone can view active products" on public.products;
create policy "Everyone can view active products"
  on public.products
  for select
  using ((is_active = true and publish_status = 'published') or public.is_admin_user());

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
  on public.products
  for insert
  with check (public.is_admin_user());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products
  for update
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products
  for delete
  using (public.is_admin_user());

alter table public.inventory_variants enable row level security;

drop policy if exists "Admins can manage inventory" on public.inventory_variants;
create policy "Admins can manage inventory"
  on public.inventory_variants
  for all
  using (public.is_admin_user());

drop policy if exists "Everyone can view inventory for active products" on public.inventory_variants;
create policy "Everyone can view inventory for active products"
  on public.inventory_variants
  for select
  using (exists (
    select 1 from public.products
    where id = product_id and is_active = true
  ));

alter table public.customer_reviews enable row level security;

drop policy if exists "Everyone can view reviews" on public.customer_reviews;
create policy "Everyone can view reviews"
  on public.customer_reviews
  for select
  using (review_status = 'approved' or public.is_admin_user() or auth.uid() = user_id);

drop policy if exists "Users can create reviews" on public.customer_reviews;
create policy "Users can create reviews"
  on public.customer_reviews
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own reviews" on public.customer_reviews;
create policy "Users can update own reviews"
  on public.customer_reviews
  for update
  using (auth.uid() = user_id);

drop policy if exists "Admins can delete reviews" on public.customer_reviews;
create policy "Admins can delete reviews"
  on public.customer_reviews
  for delete
  using (public.is_admin_user());

alter table public.wishlists enable row level security;

drop policy if exists "Users can view own wishlists" on public.wishlists;
create policy "Users can view own wishlists"
  on public.wishlists
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own wishlists" on public.wishlists;
create policy "Users can manage own wishlists"
  on public.wishlists
  for all
  using (auth.uid() = user_id);

alter table public.coupons enable row level security;

drop policy if exists "Everyone can view active coupons" on public.coupons;
create policy "Everyone can view active coupons"
  on public.coupons
  for select
  using (active = true and valid_from <= now() and valid_until >= now());

drop policy if exists "Admins can manage coupons" on public.coupons;
create policy "Admins can manage coupons"
  on public.coupons
  for all
  using (public.is_admin_user());

alter table public.shopping_carts enable row level security;

drop policy if exists "Users can view own cart" on public.shopping_carts;
create policy "Users can view own cart"
  on public.shopping_carts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own cart" on public.shopping_carts;
create policy "Users can manage own cart"
  on public.shopping_carts
  for all
  using (auth.uid() = user_id);

drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images"
  on storage.objects
  for select
  using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects
  for insert
  with check (bucket_id = 'product-images' and public.is_admin_user());

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects
  for update
  using (bucket_id = 'product-images' and public.is_admin_user())
  with check (bucket_id = 'product-images' and public.is_admin_user());

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects
  for delete
  using (bucket_id = 'product-images' and public.is_admin_user());
