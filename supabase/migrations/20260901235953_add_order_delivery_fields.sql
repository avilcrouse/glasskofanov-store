alter table public.orders
add column if not exists delivery_type text not null default 'courier',
add column if not exists pickup_point_code text,
add column if not exists pickup_point_name text,
add column if not exists pickup_point_address text;

alter table public.orders drop constraint if exists orders_delivery_type_check;
alter table public.orders add constraint orders_delivery_type_check
check (delivery_type in ('courier', 'cdek', 'yandex'));

create index if not exists orders_customer_chat_created_idx
on public.orders (customer_chat_id, created_at desc)
where customer_chat_id is not null;
