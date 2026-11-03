// Nayi category add karne ke liye list mein ek entry add karein.
export const GROUPS = [
  ['Fast Food', [['Pizza','🍕'],['Burgers','🍔'],['Sandwiches','🥪'],['Momos','🥟'],['Noodles','🍜'],['Pasta','🍝'],['Fries','🍟'],['Rolls & Wraps','🌯'],['Fried Chicken','🍗'],['Garlic Bread','🥖'],['Fast Food Combos','🍱']]],

  ['Grocery & Daily', [['Fruits & Vegetables','🥦'],['Dairy & Bread','🥛'],['Snacks','🍿'],['Cold Drinks & Juices','🥤'],['Ice Cream','🍦'],['Atta, Rice & Dal','🌾'],['Masala & Oil','🧂'],['Sweets','🍬'],['Bakery','🍞']]],
  ['Electronics', [['Mobiles','📱'],['Second Hand Phones','📲'],['Laptops','💻'],['Second Hand Laptops','🖥️'],['Earphones','🎧'],['Headphones & Speakers','🔊'],['Chargers & Cables','🔌'],['Power Banks','🔋'],['Smart Watches','⌚'],['Mobile Accessories','📷'],['Computer Accessories','⌨️'],['TV & Appliances','📺']]],
  ['Fashion', [['Men Clothes','👕'],['Women Clothes','👗'],['Kids Clothes','🧒'],['Footwear','👟'],['Bags & Wallets','👜'],['Watches','⌚'],['Jewellery','💍']]],
  ['Home & Lifestyle', [['Home & Kitchen','🍳'],['Cleaning','🧴'],['Puja Store','🪔'],['Toys & Stationery','🧸'],['Pet Supplies','🐶'],['Sports & Fitness','🏏']]],
  ['Beauty & Care', [['Bath & Body','🧼'],['Hair Care','💇'],['Skincare','🧴'],['Makeup','💄'],['Health & Pharma','💊'],['Baby Care','🍼']]],
];
export const norm = s => String(s).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
export const META = new Map(GROUPS.flatMap(([g,items])=>items.map(([n,e])=>[norm(n),{g,e}])));
export const CATEGORY_NAMES = GROUPS.flatMap(([,items])=>items.map(([name])=>name));
