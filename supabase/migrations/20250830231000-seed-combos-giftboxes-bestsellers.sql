-- Seed additional showcase categories using local images
insert into public.products (name, slug, category, price_cents, image_url, is_active) values
-- Bestsellers (diwali-gifting)
('Basket of Flavors', 'basket-of-flavors', 'Bestsellers', 139900, '/images/dryfruits/basket-of-flavors.jpg', true),
('Celebration Crunch Box', 'celebration-crunch-box', 'Bestsellers', 159900, '/images/dryfruits/celebration-crunch-box.jpg', true),
('Color of Flavor', 'color-of-flavor', 'Bestsellers', 189900, '/images/dryfruits/color-of-flavor.png', true),
('Happy Happy Pack', 'happy-happy-pack', 'Bestsellers', 129900, '/images/dryfruits/happy-happy-pack.jpg', true)
on conflict (slug) do update set
  category = excluded.category,
  price_cents = excluded.price_cents,
  image_url = excluded.image_url,
  is_active = excluded.is_active;

-- Gift Boxes (festival-gifting)
insert into public.products (name, slug, category, price_cents, image_url, is_active) values
('Del Nidhi Diwali Pack', 'del-nidhi-diwali-pack', 'Gift Boxes', 149900, '/images/dryfruits/del-nidhi-diwali-pack.jpg', true),
('Diwali Delight Boxes (Box of Four)', 'diwali-delight-boxes-box-of-four', 'Gift Boxes', 200000, '/images/dryfruits/diwali-delight-boxes-box-of-four.jpg', true),
('Festival Fusion Feast', 'festival-fusion-feast', 'Gift Boxes', 179900, '/images/dryfruits/festival-fusion-feast.jpg', true),
('Golden Glow Box', 'golden-glow-box', 'Gift Boxes', 109900, '/images/dryfruits/golden-glow-box.jpg', true)
on conflict (slug) do update set
  category = excluded.category,
  price_cents = excluded.price_cents,
  image_url = excluded.image_url,
  is_active = excluded.is_active;

-- Combos (dry-fruits-combo)
insert into public.products (name, slug, category, price_cents, image_url, is_active) values
('California Almonds & Cashews Combo [1Kg]', 'california-almond-cashews-combo-1kg', 'Combos', 114990, '/images/dryfruits/california-almond-cashew-combo.png', true),
('California Almonds & Raisins Combo [1Kg]', 'california-almonds-raisins-combo-1kg', 'Combos', 199900, '/images/dryfruits/california-almonds-raisins-combo.jpg', true),
('Cashews & Raisins Combo [1Kg]', 'cashews-raisins-combo-1kg', 'Combos', 111990, '/images/dryfruits/cashew-raisin-combo.png', true)
on conflict (slug) do update set
  category = excluded.category,
  price_cents = excluded.price_cents,
  image_url = excluded.image_url,
  is_active = excluded.is_active;

