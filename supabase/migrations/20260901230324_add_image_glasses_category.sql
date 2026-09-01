alter table public.products
drop constraint if exists products_category_check;

alter table public.products
add constraint products_category_check
check (category in (
  'Очки корригирующие',
  'Очки солнцезащитные',
  'Очки для водителя',
  'Очки спортивные',
  'Очки имиджевые'
));
