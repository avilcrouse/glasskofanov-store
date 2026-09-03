alter table public.products
add column if not exists sku text;

update public.products
set sku = 'GK-' || lpad(id::text, 6, '0')
where sku is null or btrim(sku) = '';

alter table public.products
alter column sku set not null;

alter table public.products
drop constraint if exists products_sku_not_blank;

alter table public.products
add constraint products_sku_not_blank check (btrim(sku) <> '');

create unique index if not exists products_sku_lower_unique
on public.products (lower(sku));

comment on column public.products.sku is
'Internal product SKU. Available only to the server-side admin API.';

-- RLS filters rows, not columns. Replace the broad table grant so the internal
-- SKU cannot be requested directly through the Data API by public clients.
revoke select on table public.products from anon, authenticated;

grant select (
  id,
  name,
  price,
  category,
  description,
  image,
  is_top,
  active,
  created_at
) on table public.products to anon, authenticated;

