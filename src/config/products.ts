export type Price = string | { original: string; sale: string };
export type Product = { name: string; image: string; price: Price; category: string };

export const dryFruits: Product[] = [
  { name: "Almond – California [500gm]", image: "/images/dryfruits/almond-california.png", price: "₹1,840.00", category: "Nidhis Dry Fruits" },
  { name: "Almond Gurbandi [500gm]", image: "/images/dryfruits/almond-gurbandi.jpg", price: "₹1,690.00", category: "Nidhis Dry Fruits" },
  { name: "Black Dates [500gm]", image: "/images/dryfruits/black-dates.jpg", price: "₹1,499.00", category: "Nidhis Dry Fruits" },
  { name: "Blueberry [250gm]", image: "/images/dryfruits/blueberry.jpg", price: "₹1,599.00", category: "Super Food" },
];

export const spices: Product[] = [
  { name: "Coriander Powder [100gm]", image: "/images/dryfruits/coriander-powder.jpg", price: "₹199.00", category: "Nidhis Spices" },
  { name: "Cumin Powder [100gm]", image: "/images/dryfruits/cumin-powder.jpg", price: "₹199.00", category: "Nidhis Spices" },
  { name: "Jain Sabji Masala [100gm]", image: "/images/dryfruits/jain-sabji-masala.jpg", price: "₹1,139.00", category: "Nidhis Spices" },
  { name: "Mukhwas [100gm]", image: "/images/dryfruits/mukhwas.jpg", price: "₹1,109.00", category: "Nidhis Spices" },
];

export const wholeSpices: Product[] = [
  { name: "Black Cardamom [100gm]", image: "/images/dryfruits/black-cardamom.jpg", price: "₹1,225.00", category: "Nidhis Whole Spices" },
  { name: "Black Pepper [100gm]", image: "/images/dryfruits/salt-pepper.jpg", price: "₹1,199.00", category: "Nidhis Whole Spices" },
  { name: "Cumin Seeds [100gm]", image: "/images/dryfruits/cumin-seeds.jpg", price: "₹1,125.00", category: "Nidhis Whole Spices" },
  { name: "Green Cardamom [100gm]", image: "/images/dryfruits/green-cardamom.jpg", price: { original: "₹1,399.00", sale: "₹1,349.00" }, category: "Nidhis Whole Spices" },
];

export const superFood: Product[] = [
  { name: "Blueberry [250gm]", image: "/images/dryfruits/blueberry.jpg", price: "₹1,599.00", category: "Super Food" },
  { name: "Chilgoza [250gm]", image: "/images/dryfruits/chilgoza.jpg", price: { original: "₹13,299.00", sale: "₹12,999.00" }, category: "Super Food" },
  { name: "Cranberry [250gm]", image: "/images/dryfruits/cranberry.jpg", price: "₹1,540.00", category: "Super Food" },
  { name: "Mixed Fruits, Seeds & Nuts [500gm]", image: "/images/dryfruits/mixed-fruits-seeds-nuts.png", price: "₹1,899.00", category: "Super Food" },
];

export const featured: Product[] = [
  { name: "Basket of Flavors", image: "/images/dryfruits/basket-of-flavors.jpg", price: "₹11,399.00", category: "Featured" },
  { name: "Celebration Crunch Box", image: "/images/dryfruits/celebration-crunch-box.jpg", price: "₹11,599.00", category: "Featured" },
  { name: "Color of Flavor", image: "/images/dryfruits/color-of-flavor.png", price: "₹11,899.00", category: "Featured" },
  { name: "California Almond & Cashew Combo", image: "/images/dryfruits/california-almond-cashew-combo.png", price: "₹1,999.00", category: "Featured" },
  { name: "Cashew & Raisin Combo (VKI)", image: "/images/dryfruits/cashew-raisin-combo.png", price: "₹1,849.00", category: "Featured" },
  { name: "Festival Fusion Bites", image: "/images/dryfruits/festival-fusion-bites.png", price: "₹1,425.00", category: "Featured" },
];

export const allProducts = () => [...featured, ...dryFruits, ...spices, ...wholeSpices, ...superFood];
