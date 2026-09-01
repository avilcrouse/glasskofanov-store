alter table public.products
add column if not exists images text[] not null default '{}'::text[];

update public.products
set images = array[image]
where cardinality(images) = 0
  and nullif(btrim(image), '') is not null;

alter table public.products
drop constraint if exists products_images_not_empty;

alter table public.products
add constraint products_images_not_empty
check (cardinality(images) > 0);

grant select (images) on table public.products to anon, authenticated;
