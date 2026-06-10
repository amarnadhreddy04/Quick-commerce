/** Home-screen category groups — mixed layout like Blinkit, Instamart, Zepto, BigBasket */
export type CategorySectionDef = {
  id: string;
  title: string;
  categoryIds: string[];
};

export const HOME_CATEGORY_SECTIONS: CategorySectionDef[] = [
  {
    id: 'fresh',
    title: 'Fresh & Everyday',
    categoryIds: ['fruits', 'milk', 'eggs', 'meat', 'organic'],
  },
  {
    id: 'staples',
    title: 'Grocery & Staples',
    categoryIds: ['atta-rice', 'oil-masala', 'dry-fruits', 'sauces', 'pickles'],
  },
  {
    id: 'bakery',
    title: 'Bakery & Ready to Eat',
    categoryIds: ['bread', 'breakfast', 'instant-food', 'frozen', 'ice-cream'],
  },
  {
    id: 'snacks',
    title: 'Snacks & Munchies',
    categoryIds: ['snacks', 'biscuits', 'sweets'],
  },
  {
    id: 'drinks',
    title: 'Drinks & Cafe',
    categoryIds: ['beverages', 'tea-coffee', 'cafe', 'gourmet', 'paan'],
  },
  {
    id: 'personal',
    title: 'Personal Care & Beauty',
    categoryIds: ['personal-care', 'beauty', 'hygiene'],
  },
  {
    id: 'home',
    title: 'Home & Cleaning',
    categoryIds: ['cleaning', 'home', 'kitchenware'],
  },
  {
    id: 'family',
    title: 'Baby, Pet & Wellness',
    categoryIds: ['baby-care', 'pet-care', 'pharma', 'sports'],
  },
  {
    id: 'electronics',
    title: 'Electronics & Fashion',
    categoryIds: ['electronics', 'mobiles', 'fashion', 'footwear'],
  },
  {
    id: 'more',
    title: 'More to Explore',
    categoryIds: ['toys', 'stationery', 'books', 'gifts', 'festive', 'plants'],
  },
];
