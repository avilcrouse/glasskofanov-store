alter table public.orders
  add column if not exists payment_id text,
  add column if not exists payment_token uuid,
  add column if not exists payment_status text not null default 'not_started',
  add column if not exists paid_at timestamptz;

update public.orders
set payment_status = 'legacy'
where payment_id is null
  and status <> 'Ожидает оплаты';

create index if not exists orders_payment_id_idx
on public.orders (payment_id);
