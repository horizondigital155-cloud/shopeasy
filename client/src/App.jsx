import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORY_NAMES } from './categories.js';
export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.Capacitor?.isNativePlatform() || (window.location.origin.includes('localhost') && !window.location.port) || window.location.protocol === 'file:' || (window.location.hostname === 'localhost' && window.location.port !== '5173')) {
      return localStorage.getItem('shopeasy_api_server') || 'http://localhost:4000';
    }
  }
  return '';
};

export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/uploads/') || url.startsWith('/img/')) {
    return getApiBaseUrl() + url;
  }
  return url;
};

const api = async (url, method='GET', body) => {
  const isForm = body instanceof FormData;
  const baseUrl = getApiBaseUrl();
  const r=await fetch(baseUrl+'/api'+url,{method,credentials:'include',headers:body&&!isForm?{'Content-Type':'application/json'}:{},body:body&&(isForm?body:JSON.stringify(body))});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Request fail hua');return d;
};
const rupee = n => String.fromCharCode(8377) + Number(n || 0).toLocaleString('en-IN');
const lc=s=>String(s||'').trim().toLowerCase();

/* ---------- Icons (SVG, no emoji) ---------- */
const IC={
 pin:'<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
 crown:'<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><circle cx="12" cy="17" r=".6"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4-6 8-6s7 1.5 8 6"/>',
 box:'<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
 logout:'<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
 moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
 cart:'<path d="M2 3h3l2.5 12h11L21 7H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>',
 clock:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/>',
 tag:'<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
 ret:'<path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 fb:'<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5c0-.3.2-.5.5-.5z"/>',
 ig:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/>',
 yt:'<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/>',
 x:'<path d="M4 4l16 16M20 4L4 20"/>',
 in:'<path d="M6 9v10M6 5v.5M11 19v-10M11 13a4 4 0 0 1 8 0v6"/>',
 rider:'<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17h5l3-7h3l1 7M9 10h3"/>',
 bag:'<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
 gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8c-2 0-4-1-4-3a2 2 0 0 1 4 0 2 2 0 0 1 4 0c0 2-2 3-4 3z"/>',
 phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
 home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 chevL:'<path d="M15 5l-7 7 7 7"/>',
 chevR:'<path d="M9 5l7 7-7 7"/>'
};
function Ic({n,s=22}){return <svg className="ic" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{__html:IC[n]}}/>}

/* ---------- Photos ----------
   Pic pehle tumhari apni file /public/img/<f>.jpg try karta hai (jaise cat-fruits-veg.jpg),
   na mile to neeche PHOTO[k] ki online photo, wo bhi na mile to neat icon tile. */
const UN=id=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;
const PHOTO={
 'fruits-veg':UN('photo-1540420773420-3366772f4999'),
 'dairy-bakery':'/img/cat-dairy-bakery.jpg',
 'atta-rice-dals':UN('photo-1586201375761-83865001e31c'),
 'masala-spices':UN('photo-1532336414038-cf19250c5757'),
 'cooking-essentials':UN('photo-1474979266404-7eaacbcd87c5'),
 'snacks-beverages':UN('photo-1621939514649-280e2aa2f0b2'),
 'personal-care':UN('photo-1608248543803-ba4f8c70ae0b'),
 'home-care':UN('photo-1540555700478-4be289fbecef'),
 'health-wellness':UN('photo-1505751172876-fa1923c5c528'),
 'pet-care':UN('photo-1589924691995-400dc9b6e7a1'),
 'beauty-cosmetics':UN('photo-1596462502278-27bfdc403348'),
 'basket':UN('photo-1542838132-92c53300491e')
 /* baby-care, stationery, electronics, kitchen-dining, gifts, fashion, automotive, toys-games, books:
    abhi online photo set nahi hai -> /public/img/cat-<naam>.jpg daalo, ya yahan UN('photo-...') add karo */
};
/* Jin sections ki photo nahi mili wahan ye illustrated image dikhti hai (grey box / icon nahi) */
const ART={
 'baby-care':['#c9edf2','#eefafb',<><rect x="29" y="36" width="26" height="46" rx="9" fill="#fff" stroke="#8fd0dc" strokeWidth="1.6"/><rect x="31" y="58" width="22" height="22" rx="7" fill="#e3f5f9"/><path d="M33 48h8M33 54h8M33 60h8" stroke="#8fd0dc" strokeWidth="1.4"/><rect x="28" y="30" width="28" height="9" rx="3" fill="#5bbfd2"/><path d="M35 30c0-10 3-15 7-15s7 5 7 15z" fill="#f4d7a1"/><rect x="62" y="48" width="19" height="34" rx="5" fill="#fff" stroke="#f0b3c3" strokeWidth="1.5"/><rect x="62" y="59" width="19" height="13" fill="#f7c4d2"/><rect x="68" y="40" width="7" height="9" fill="#f0b3c3"/><rect x="65" y="37" width="13" height="4" rx="2" fill="#f0b3c3"/></>],
 'health-wellness':['#d3edd7','#f2faf3',<><path d="M16 82c0-18 8-30 22-32-2 16-9 28-22 32z" fill="#4caf6e"/><rect x="36" y="38" width="30" height="44" rx="7" fill="#e08a2c"/><rect x="40" y="40" width="5" height="40" rx="2" fill="#fff" opacity=".25"/><rect x="38" y="27" width="26" height="12" rx="3" fill="#fff" stroke="#d6ddd6"/><rect x="36" y="54" width="30" height="20" fill="#fff"/><path d="M49 57h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="#2f9e5b"/><rect x="68" y="72" width="16" height="7" rx="3.5" fill="#f2b705" transform="rotate(-20 76 75)"/><circle cx="80" cy="64" r="4.5" fill="#fff" stroke="#e3e6e3"/></>],
 'stationery':['#e1e5f6','#f6f7fd',<><rect x="24" y="30" width="40" height="52" rx="3" fill="#3f6fd8"/><rect x="24" y="30" width="7" height="52" fill="#2b53b0"/><rect x="37" y="42" width="21" height="13" rx="1" fill="#fff"/><path d="M40 47h15M40 51h11" stroke="#9db3e8" strokeWidth="1.4"/><g transform="rotate(22 72 55)"><rect x="68" y="24" width="9" height="46" fill="#f4c430"/><path d="M68 70h9l-4.5 11z" fill="#f1d3a5"/><path d="M71 77h3l-1.5 4z" fill="#333"/><rect x="68" y="19" width="9" height="6" fill="#e56b6b"/></g></>],
 'electronics':['#dde2ee','#f3f5fa',<><path d="M24 62V52a26 26 0 0 1 52 0v10" fill="none" stroke="#2b2f3a" strokeWidth="6" strokeLinecap="round"/><rect x="17" y="56" width="15" height="26" rx="7.5" fill="#3b4150"/><rect x="68" y="56" width="15" height="26" rx="7.5" fill="#3b4150"/><rect x="21" y="60" width="4" height="18" rx="2" fill="#6b7488"/><rect x="75" y="60" width="4" height="18" rx="2" fill="#6b7488"/><path d="M30 34a24 24 0 0 1 20-8" stroke="#fff" strokeWidth="2" opacity=".5" fill="none" strokeLinecap="round"/></>],
 'kitchen-dining':['#e8e9ee','#f7f7f9',<><rect x="25" y="46" width="42" height="32" rx="5" fill="#b4bcc9"/><rect x="29" y="50" width="5" height="24" rx="2" fill="#fff" opacity=".35"/><path d="M23 46a23 9 0 0 1 46 0z" fill="#d6dce6"/><circle cx="46" cy="34" r="3.5" fill="#6b7480"/><rect x="14" y="54" width="11" height="5" rx="2.5" fill="#6b7480"/><rect x="67" y="54" width="11" height="5" rx="2.5" fill="#6b7480"/><rect x="82" y="34" width="4" height="46" rx="2" fill="#8a5a2b"/><ellipse cx="84" cy="32" rx="7" ry="6" fill="#c9cfd8"/></>],
 'gifts':['#fddccc','#fff2eb',<><rect x="18" y="58" width="24" height="22" rx="2" fill="#2aa6a0"/><rect x="28" y="58" width="5" height="22" fill="#ffd166"/><rect x="30" y="46" width="44" height="34" rx="3" fill="#e5484d"/><rect x="26" y="38" width="52" height="12" rx="3" fill="#f0656a"/><rect x="48" y="38" width="8" height="42" fill="#ffd166"/><path d="M52 38c-8-13-21-9-15 0 4 4 11 2 15 0zM52 38c8-13 21-9 15 0-4 4-11 2-15 0z" fill="#ffd166"/></>],
 'fashion':['#d9e3f4','#f2f6fc',<><path d="M34 26l-17 11 6 13 9-4v36h42V46l9 4 6-13-17-11c-2 6-8 9-15 9s-13-3-15-9z" fill="#2f6fcf"/><path d="M42 26c2 6 6 9 11 9s9-3 11-9" fill="none" stroke="#1f4f9f" strokeWidth="2"/><path d="M36 40v38" stroke="#fff" opacity=".18" strokeWidth="3"/></>],
 'automotive':['#ebe0e0','#f7f1f1',<><path d="M10 66l6-16c2-4 6-7 11-7h30c5 0 9 2 12 6l9 9c5 1 8 4 8 9v5H10z" fill="#d94a4a"/><path d="M29 51l5-9h22l9 9z" fill="#cfe6f5"/><path d="M44 42v9" stroke="#d94a4a" strokeWidth="2"/><circle cx="30" cy="72" r="10" fill="#2a2d33"/><circle cx="30" cy="72" r="4.5" fill="#aeb4bd"/><circle cx="71" cy="72" r="10" fill="#2a2d33"/><circle cx="71" cy="72" r="4.5" fill="#aeb4bd"/><circle cx="14" cy="62" r="2.5" fill="#ffd166"/></>],
 'toys-games':['#fdebc4','#fff7e3',<><circle cx="32" cy="30" r="7" fill="#c98f5b"/><circle cx="58" cy="30" r="7" fill="#c98f5b"/><ellipse cx="45" cy="68" rx="20" ry="17" fill="#c98f5b"/><circle cx="45" cy="42" r="16" fill="#d9a06b"/><ellipse cx="45" cy="47" rx="7.5" ry="5.5" fill="#f2d3a8"/><circle cx="39" cy="40" r="2" fill="#3b2a1d"/><circle cx="51" cy="40" r="2" fill="#3b2a1d"/><ellipse cx="45" cy="45" rx="2.5" ry="1.8" fill="#3b2a1d"/><rect x="68" y="64" width="18" height="18" rx="2" fill="#4f9be0"/><rect x="72" y="47" width="16" height="16" rx="2" fill="#e5484d" transform="rotate(8 80 55)"/></>],
 'books':['#e3ddf2','#f4f1fb',<><rect x="20" y="64" width="62" height="15" rx="2" fill="#2f6fcf"/><rect x="24" y="49" width="56" height="15" rx="2" fill="#e5484d"/><rect x="21" y="34" width="58" height="15" rx="2" fill="#2f9e5b"/><rect x="72" y="66" width="10" height="11" fill="#fff" opacity=".85"/><rect x="70" y="51" width="10" height="11" fill="#fff" opacity=".85"/><rect x="71" y="36" width="8" height="11" fill="#fff" opacity=".85"/><path d="M30 64v15M34 49v15" stroke="#fff" opacity=".4" strokeWidth="2"/></>],
 'dryfruits':['#f3dfc2','#fcf2e1',<><circle cx="34" cy="48" r="7" fill="#d9a06b"/><ellipse cx="48" cy="44" rx="8" ry="6" fill="#c98f5b"/><ellipse cx="62" cy="48" rx="7" ry="5.5" fill="#f0d9a8"/><circle cx="42" cy="52" r="5" fill="#8fbf6a"/><circle cx="56" cy="53" r="5" fill="#5b3a2a"/><circle cx="70" cy="54" r="4.5" fill="#8fbf6a"/><path d="M18 56h64c0 17-13 27-32 27S18 73 18 56z" fill="#8a5a2b"/><path d="M26 60c4 10 12 15 24 15" stroke="#fff" opacity=".2" strokeWidth="3" fill="none"/></>],
 'pet-care':['#f6e7d0','#fdf6ea',<><path d="M20 56h46c0 14-9 24-23 24S20 70 20 56z" fill="#3f8fd8"/><ellipse cx="43" cy="56" rx="23" ry="5" fill="#2b6fb0"/><circle cx="34" cy="54" r="4" fill="#a8693a"/><circle cx="44" cy="52" r="4" fill="#c98f5b"/><circle cx="53" cy="54" r="4" fill="#a8693a"/><g transform="rotate(-30 74 62)"><rect x="62" y="58" width="24" height="8" rx="4" fill="#f4ead8" stroke="#d8c8a8"/><circle cx="62" cy="58" r="5" fill="#f4ead8" stroke="#d8c8a8"/><circle cx="62" cy="66" r="5" fill="#f4ead8" stroke="#d8c8a8"/><circle cx="86" cy="58" r="5" fill="#f4ead8" stroke="#d8c8a8"/><circle cx="86" cy="66" r="5" fill="#f4ead8" stroke="#d8c8a8"/></g></>],
 'snacks-beverages':['#fde0e0','#fff1f1',<><path d="M20 30h34l-2 52H22z" fill="#f4b81f"/><path d="M20 30c6 4 12 4 17 0s11-4 17 0" fill="none" stroke="#fff" opacity=".6" strokeWidth="2"/><circle cx="37" cy="54" r="11" fill="#e5484d"/><path d="M32 54h10" stroke="#fff" strokeWidth="2.5"/><rect x="62" y="38" width="20" height="44" rx="4" fill="#d62828"/><rect x="62" y="52" width="20" height="9" fill="#fff"/><rect x="64" y="34" width="16" height="5" rx="2" fill="#b0b8c4"/></>]
};
const ART_FIRST=new Set(['baby-care','health-wellness']); /* inke liye product/online photo skip (galat photo ka issue) */
function ArtSvg({k,className=''}){const [c1,c2,g]=ART[k];return <svg className={'art-svg '+className} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id={'ag-'+k} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1}/><stop offset="1" stopColor={c2}/></linearGradient></defs><rect width="100" height="100" fill={`url(#ag-${k})`}/><ellipse cx="50" cy="84" rx="32" ry="4.5" fill="#000" opacity=".1"/>{g}</svg>}
function Pic({f,k,x,className='',icon='bag',s=22}){
 const first=ART_FIRST.has(k);
 const srcs=[f&&`/img/${f}.jpg`,first?null:PHOTO[k],first?null:x].filter(Boolean);
 const [i,setI]=useState(0);
 useEffect(()=>{setI(0)},[f,k,x]);
 if(i<srcs.length)return <img className={className} src={srcs[i]} alt="" loading="lazy" onError={()=>setI(i+1)}/>;
 return ART[k]?<ArtSvg k={k} className={className}/>:<span className={'ph '+className}><Ic n={icon} s={s}/></span>;
}

/* Sidebar / category strip. [name, image slug, backend categories, pastel] -> /img/cat-<slug>.jpg */
const NAV=[
 ['Fast Food','fast-food',['Pizza','Burgers','Sandwiches','Momos','Noodles','Pasta','Fries','Rolls & Wraps','Fried Chicken','Garlic Bread','Fast Food Combos'],'#ffe1d6'],
 ['Fruits & Vegetables','fruits-veg',['Fruits','Vegetables'],'#e6f4dc'],
 ['Dairy & Bakery','dairy-bakery',['Dairy & Eggs','Bakery','Frozen Foods'],'#f6eadb'],
 ['Atta, Rice & Dals','atta-rice-dals',['Staples'],'#f7ecd6'],
 ['Masala & Spices','masala-spices',['Spices'],'#f6dfd8'],
 ['Cooking Essentials','cooking-essentials',['Oils'],'#fdf0c9'],
 ['Snacks & Beverages','snacks-beverages',['Snacks','Beverages'],'#fde0e0'],
 ['Personal Care','personal-care',['Personal Care'],'#dff3e4'],
 ['Home Care & Cleaning','home-care',['Household'],'#dcecfb'],
 ['Baby Care','baby-care',['Baby Care'],'#d9f1f3'],
 ['Health & Wellness','health-wellness',['Dry Fruits','Health & Wellness'],'#fbdede'],
 ['Stationery & Office','stationery',[],'#e9ecf4'],
 ['Electronics & Accessories','electronics',[],'#e8e8ee'],
 ['Kitchen & Dining','kitchen-dining',[],'#ececec'],
 ['Beauty & Cosmetics','beauty-cosmetics',['Beauty & Care'],'#fbe0e6'],
 ['Festive & Gifts','gifts',[],'#fde5d6'],
 ['Fashion & Accessories','fashion',[],'#dde6f3'],
];
const SHORT={'Fast Food':'Fast Food','Fruits & Vegetables':'Fruits & Vegetables','Dairy & Bakery':'Dairy & Bakery','Atta, Rice & Dals':'Atta, Rice & Dals','Masala & Spices':'Masala & Spices','Cooking Essentials':'Cooking Essentials','Snacks & Beverages':'Snacks & Beverages','Personal Care':'Personal Care','Home Care & Cleaning':'Home Care','Baby Care':'Baby Care','Health & Wellness':'Health & Wellness','Stationery & Office':'Stationery','Electronics & Accessories':'Electronics','Kitchen & Dining':'Kitchen & Dining','Beauty & Cosmetics':'Beauty & Cosmetics','Festive & Gifts':'Gifts','Fashion & Accessories':'Fashion',};
/* [name, subtitle, gradient, image slug -> /img/hl-<slug>.jpg, button colour] */
const HIGHLIGHTS=[
 ['Fast Food','Quick bites','linear-gradient(135deg,#ffe0d4,#fff1e9)','fast-food','#d9541e'],
 ['Fruits & Vegetables','Fresh from farms','linear-gradient(135deg,#e3f4d8,#f4fbe9)','fruits-veg','#e8890c'],
 ['Dairy & Bakery','Fresh & Healthy','linear-gradient(135deg,#f6e6d2,#fdf4e8)','dairy-bakery','#d9541e'],
 ['Atta, Rice & Dals','Everyday Essentials','linear-gradient(135deg,#f3e4c9,#fbf2de)','atta-rice-dals','#7a4a1d'],
 ['Masala & Spices','Pure & Aromatic','linear-gradient(135deg,#f0d9c7,#f8ebdf)','masala-spices','#5b3a1c'],
 ['Snacks & Beverages','Top Brands','linear-gradient(135deg,#fddbe0,#ffeef0)','snacks-beverages','#d62828'],
 ['Personal Care','Beauty & Hygiene','linear-gradient(135deg,#d9eefa,#eef8fd)','personal-care','#2d6fb7'],
 ['Home Care & Cleaning','Clean & Fresh Home','linear-gradient(135deg,#d6ecfb,#e9f6fe)','home-care','#2d6fb7'],
 ['Baby Care','For Your Little One','linear-gradient(135deg,#d3f0f2,#e8f9fa)','baby-care','#1f8a9a']
];

/* ---------- Sliding posters (yahin se offer / discount / text badalna) ----------
   g = shop now dabane par kaun si category khule. Slide mein us category ke asli products + unke price dikhte hain.
   f = apni image /public/img/<f>.jpg ; k = backup online photo (PHOTO ki key). */
const SLIDES=[
 {cls:'sl-service-cylinder',eyebrow:'Gas Cylinder Delivery',title:'Cylinder Ghar Tak',off:'Book Home Delivery',sub:'Gas Cylinder Service',serviceKind:'gas',image:'/img/shopeasy-cylinder-poster.png'},
 {cls:'sl-service-train',eyebrow:'Train Delivery',title:'Train Food & Parcel',off:'Book Train Delivery',sub:'Food aur Parcel seedhe aapki seat par',serviceKind:'train-food',image:'/img/shopeasy-train-poster.png'},
 {cls:'sl-diwali',eyebrow:'Diwali Special',title:'Diwali Dhamaka Sale',off:'Up to 40% OFF',sub:'Dry Fruits | Sweets | Gifts',g:'Health & Wellness',f:'diwali-1',k:'dryfruits'},
 {cls:'sl-sweet',eyebrow:'Diwali Special',title:'Mithai, Bakery & Snacks',off:'Up to 35% OFF',sub:'Festive treats for every celebration',g:'Dairy & Bakery',f:'diwali-2',k:'dairy-bakery'},
 {cls:'sl-pooja',eyebrow:'Diwali Special',title:'Pooja & Kitchen Essentials',off:'Up to 30% OFF',sub:'Ghee, Oils, Masala & more',g:'Cooking Essentials',f:'diwali-3',k:'cooking-essentials'},
 {cls:'sl-fresh',eyebrow:'Fresh Daily',title:'Fresh Fruits & Vegetables',off:'Up to 50% OFF',sub:'Farm Fresh | Daily Delivery | Best Quality',g:'Fruits & Vegetables',f:'hero-fruits',k:'fruits-veg'}
];
const SIDE_A=[
 {t:'Dairy & Bakery',sub:'Fresh & Healthy',off:'Up to 40% OFF',g:'Dairy & Bakery',f:'hero-dairy',k:'dairy-bakery'},
 {t:'Diwali Dry Fruits',sub:'Gifting Packs',off:'Up to 30% OFF',g:'Health & Wellness',f:'hero-dryfruits',k:'dryfruits'}
];
const SIDE_B=[
 {t:'Snacks & Beverages',sub:'Your Favorite Brands',off:'Up to 50% OFF',g:'Snacks & Beverages',f:'hero-snacks',k:'snacks-beverages'},
 {t:'Diwali Pooja Needs',sub:'Ghee, Oils & Masala',off:'Up to 30% OFF',g:'Cooking Essentials',f:'hero-pooja',k:'cooking-essentials'}
];

const inGroup=(p,g)=>{const n=NAV.find(x=>x[0]===g);if(!n)return false;const norm=s=>lc(s).replace(/&/g,'and').replace(/[^a-z0-9]/g,'');const c=norm(p.category);if(norm(g)===c||n[2].some(x=>norm(x)===c))return true;if(g==='Fast Food'){return ['pizza','burger','burgers','sandwich','sandwiches','momos','noodles','pasta','fries','rolls','wraps','rollsandwraps','friedchicken','garlicbread','fastfoodcombos'].includes(c)}return false};
const offPct=p=>p.mrp&&Number(p.mrp)>Number(p.price)?Math.round((1-p.price/p.mrp)*100):0;

function Logo(){return <svg className="logo" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#16834a"/><path d="M7 10h4l3 14h14l3-10H13" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 15h14M16 19h12" stroke="#ffc857" strokeWidth="2" strokeLinecap="round"/><circle cx="17" cy="30" r="2.2" fill="#fff"/><circle cx="27" cy="30" r="2.2" fill="#fff"/></svg>}
function Auth({onDone,onClose}){
 const [mode,setMode]=useState('login');
 const [f,setF]=useState({email:'',phone:'',name:'',otp:'',password:''});
 const [err,setErr]=useState('');
 const [info,setInfo]=useState('');
 const [busy,setBusy]=useState(false);
 const actionLock=useRef(false);
 const [sent,setSent]=useState(false);
 const set=k=>e=>setF(old=>({...old,[k]:e.target.value}));
 const run=fn=>async e=>{e.preventDefault();if(actionLock.current)return;actionLock.current=true;setErr('');setInfo('');setBusy(true);try{await fn()}catch(x){setErr(x.message)}finally{actionLock.current=false;setBusy(false)}};
 const changeMode=m=>{setMode(m);setErr('');setInfo('');setSent(false);setF(old=>({...old,otp:'',password:''}))};
 const sendOtp=run(async()=>{
   const payload={email:f.email,purpose:mode==='register'?'register':'login'};
   if(mode==='register'){payload.name=f.name;payload.phone=f.phone}
   const result=await api('/auth/send-otp','POST',payload);
   setSent(true);setInfo(result.message||'OTP bhej diya gaya hai.');
 });
  const verifyOtp=run(async()=>{
    const result=await api('/auth/verify-otp','POST',{
      email:f.email,
      otp:f.otp,
      purpose:mode==='register'?'register':'login'
    });

    if(!result || result.role!=='customer'){
      throw new Error('Customer login response invalid hai.');
    }

    const session=await api('/me');

    if(!session || session.role!=='customer'){
      throw new Error('OTP verify hua, lekin Customer Session confirm nahi hui. Dobara login karein.');
    }

    await onDone(session);
  });
 const riderLogin=run(async()=>{
   const result=await api('/rider/login','POST',{phone:f.phone,password:f.password});
   await onDone(result);
 });
 return <div className="overlay" onClick={onClose}><div className="sheet" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Account login">
  <div className="tabs">
   <button type="button" className={mode==='login'?'on':''} onClick={()=>changeMode('login')}>Email Login</button>
   <button type="button" className={mode==='register'?'on':''} onClick={()=>changeMode('register')}>Sign up</button>
   <button type="button" className={mode==='rider'?'on':''} onClick={()=>changeMode('rider')}>Rider</button>
  </div>
  {mode==='rider'?<form onSubmit={riderLogin}>
      <label>Rider mobile number<input inputMode="numeric" maxLength={10} value={f.phone} onChange={set('phone')} required autoComplete="tel" pattern="[6-9][0-9]{9}" title="10 digit Indian mobile number"/></label>
      <label>Password<input type="password" value={f.password} onChange={set('password')} required autoComplete="current-password"/></label>
      {err&&<p className="err">{err}</p>}
      <button className="btn" disabled={busy}>{busy?'Please wait...':'Rider login'}</button>
    </form>:<form onSubmit={sent?verifyOtp:sendOtp}>
      {mode==='register'&&<><label>Full name<input value={f.name} onChange={set('name')} required maxLength={60} autoComplete="name" disabled={sent}/></label><label>Mobile number<input inputMode="numeric" maxLength={10} value={f.phone} onChange={set('phone')} required autoComplete="tel" pattern="[6-9][0-9]{9}" title="10 digit Indian mobile number" disabled={sent}/></label></>}
      <label>Email address<input type="email" value={f.email} onChange={set('email')} required autoComplete="email" maxLength={254} placeholder="you@example.com" disabled={sent}/></label>
      {sent&&<label>6-digit OTP<input inputMode="numeric" value={f.otp} onChange={set('otp')} required pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="Enter OTP"/></label>}
      {info&&<p className="hint">{info}</p>}
      {err&&<p className="err">{err}</p>}
      <button className="btn" disabled={busy}>{busy?'Please wait...':sent?'Verify OTP':'Send OTP'}</button>
      {sent&&<button type="button" className="link" onClick={()=>{setSent(false);setInfo('');setF(old=>({...old,otp:''}))}}>Change email / try again</button>}
      <p className="hint">{mode==='register'?'Email verify hone ke baad account create hoga.':'Email par OTP bhejkar login karein.'} OTP 5 minutes tak valid hai.</p>
      {mode==='login'&&<div className="customer-login-note">
        <strong>Customer Login</strong>
        <span>Are you a customer? Login here to shop with ShopEasy.</span>
        <b>Customers can login here.</b>
        <small>Enter your email address and verify using OTP.</small>
      </div>}
    </form>}</div></div>;
}
function ProductForm({initial,onSave,onCancel,busy}){
 const [f,setF]=useState(initial||{name:'',category:'',unit:'',price:'',image:'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85'});
 return <form className="admin-form" onSubmit={e=>{e.preventDefault();onSave({...f,price:Number(f.price)})}}>
 <label>Product name<input value={f.name} onChange={e=>setF({...f,name:e.target.value})} required maxLength={120}/></label>
 <label>Category<input list="categories" value={f.category} onChange={e=>setF({...f,category:e.target.value})} required maxLength={80}/><datalist id="categories">{CATEGORY_NAMES.map(c=><option key={c} value={c}/>)}</datalist></label>
 <label>Unit / size<input value={f.unit||''} onChange={e=>setF({...f,unit:e.target.value})} placeholder="1 kg, 500 ml"/></label>
 <label>Price (?)<input type="number" min="1" step="1" value={f.price} onChange={e=>setF({...f,price:e.target.value})} required/></label>
 <label>Original image URL<input type="url" value={f.image} onChange={e=>setF({...f,image:e.target.value})} placeholder="https://..." required/><small className="hint">Product save karne ke baad Photo button se apni HD photo upload kar sakte hain.</small></label>
 <div className="form-actions"><button className="btn" disabled={busy}>{busy?'Saving...':'Save product'}</button><button type="button" className="link" onClick={onCancel}>Cancel</button></div>
 </form>;
}
function Orders({user,riders=[],reload}){
 const [rows,setRows]=useState(null),[err,setErr]=useState('');
 const load=()=>api('/orders').then(setRows).catch(e=>setErr(e.message));
 useEffect(()=>{load()},[]);
 const cancelOrder=async o=>{
  const choice=window.prompt('Cancellation reason select karein:\n1 = Ordered by mistake\n2 = Want to change the order\n3 = Other reason','1');
  if(choice===null)return;
  const reasons={'1':'Ordered by mistake','2':'Want to change the order','3':'Other reason'};
  const reason=reasons[String(choice).trim()];
  if(!reason){setErr('1, 2, ya 3 select karein.');return;}
  if(!window.confirm(`Order #${o.id} cancel karna chahte hain?`))return;
  try{
   const result=await api(`/orders/${o.id}/cancel`,'POST',{reason});
   await load();
   const phone=String(result.riderPhone||o.rider_phone||'8005711525').replace(/\D/g,'');
   const message=[
    'SHOPEASY - ORDER CANCELLATION',
    `Order Number: #${o.id}`,
    `Customer: ${user?.name||user?.phone||'Customer'}`,
    `Reason: ${reason}`,
    'This order cancellation is recorded in the ShopEasy app.',
    'Please confirm and do not deliver this order.'
   ].join('\n');
   toast(result.message||'Cancellation recorded. WhatsApp khul raha hai.');
   window.location.href='https://wa.me/'+(phone.startsWith('91')?phone:'91'+phone)+ '?text='+encodeURIComponent(message);
  }catch(e){setErr(e.message||'Order cancel nahi hua.');}
 };
 if(!rows)return <p className="empty">{err||'Loading orders...'}</p>;
 if(!rows.length)return <p className="empty">Abhi koi order nahi hai.</p>;
 return <div className="orders">{err&&<p className="error">{err}</p>}{rows.map(o=><article className="order" key={o.id}>
 <header><b>Order #{o.id}</b><span>{new Date(o.created).toLocaleString('en-IN')}</span></header>
 {user.role==='admin'&&<p className="meta">{o.name||o.account_name} - {o.phone}<br/>{o.address}</p>}
 <ul>{o.items.map((i,index)=><li key={`${i.id}-${index}`}><span>{i.name}{i.unit||i.product?.unit ? ` ? ${i.unit||i.product?.unit}` : ""} . Qty: {i.qty??1}</span><span>{rupee(Number(i.price??i.product?.price??0)*Number(i.qty??1))}</span></li>)}</ul>
 {user.role==='customer'&&<p className="meta">{String(o.status).toLowerCase()==='placed'?'Items are placed. Please wait for a delivery partner to accept the order.':String(o.status).toLowerCase()==='assigned'?'Delivery partner accepted your order. Please wait for the delivery partner to call.':String(o.status).toLowerCase()==='picked_up'?'Your order is on the way. Please keep your phone available.':String(o.status).toLowerCase()==='delivered'?'Order delivered successfully. Thank you for shopping with ShopEasy!':String(o.status).toLowerCase()==='cancelled'?`Order cancelled. Reason: ${o.cancellation_reason||'Not specified'}`:'Order status: '+o.status}</p>}
 <footer><span>{o.payment} - {o.payment_status} - {o.status}</span><b>{rupee(o.total)}</b>
 {user.role==='customer'&&['placed','assigned'].includes(String(o.status).toLowerCase())&&<button className="link danger" onClick={()=>cancelOrder(o)}>Cancel Order</button>}
 {String(o.status).toLowerCase()==='cancelled'&&<span className="meta">Cancelled {o.cancelled_at?new Date(o.cancelled_at).toLocaleString('en-IN'):''}</span>}
 {user.role==='admin'&&<><select aria-label="Assign rider" defaultValue={o.rider_id||''} onChange={async e=>{if(e.target.value){try{await api(`/admin/orders/${o.id}/assign`,'POST',{riderId:Number(e.target.value)});load()}catch(x){setErr(x.message)}}}}><option value="">Assign rider</option>{riders.filter(r=>r.active).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><button className="link danger" onClick={async()=>{if(confirm('Order delete karein?')){await api('/orders/'+o.id,'DELETE');load();reload?.()}}}>Delete</button></>}
 </footer></article>)}</div>;
}
function Admin({products,onRefresh,riders,setRiders}){
 const [edit,setEdit]=useState(null),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[photoBusy,setPhotoBusy]=useState('');
 const [rider,setRider]=useState({name:'',phone:'',password:'',photo:''});
 const [tab,setTab]=useState('dashboard');
 const [orders,setOrders]=useState([]);
 const [ordersBusy,setOrdersBusy]=useState(false);
 const [expense,setExpense]=useState('');
 const [expenses,setExpenses]=useState(()=>{try{return JSON.parse(localStorage.getItem('shopeasy-admin-expenses')||'[]')}catch{return[]}});
 const [upiId,setUpiId]=useState(()=>localStorage.getItem('shopeasy-upi-id')||'');
 const [upiName,setUpiName]=useState(()=>localStorage.getItem('shopeasy-upi-name')||'ShopEasy');
 const [upiAmount,setUpiAmount]=useState('');
 const [upiSaved,setUpiSaved]=useState(false);

 const loadOrders=async()=>{setOrdersBusy(true);try{const data=await api('/orders');setOrders(Array.isArray(data)?data:[])}catch(e){setErr(e.message)}finally{setOrdersBusy(false)}};
 useEffect(()=>{loadOrders()},[]);
 const save=async f=>{setBusy(true);setErr('');try{if(edit?.id)await api('/admin/products/'+edit.id,'PUT',f);else await api('/admin/products','POST',f);setEdit(null);await onRefresh()}catch(e){setErr(e.message)}finally{setBusy(false)}};
 const photo=async(p,file)=>{if(!file)return;setPhotoBusy(p.id);setErr('');try{const blob=await downscaleJpeg(file);if(blob.size>700*1024)throw new Error('Image compress nahi hui. Chhoti image select karein.');const fd=new FormData();fd.append('photo',blob,'product.jpg');await api(`/admin/products/${p.id}/photo`,'POST',fd);await onRefresh()}catch(e){setErr(e.message)}finally{setPhotoBusy('')}};
 const resetPhoto=async p=>{try{await api(`/admin/products/${p.id}/photo`,'DELETE');await onRefresh()}catch(e){setErr(e.message)}};
 const addRider=async e=>{e.preventDefault();setErr('');try{await api('/admin/riders','POST',rider);setRider({name:'',phone:'',password:'',photo:''});setRiders(await api('/admin/riders'))}catch(x){setErr(x.message)}};
 const addExpense=e=>{e.preventDefault();const amount=Number(expense);if(!Number.isFinite(amount)||amount<=0)return;const next=[{id:Date.now(),amount,created:Date.now()} ,...expenses];setExpenses(next);localStorage.setItem('shopeasy-admin-expenses',JSON.stringify(next));setExpense('')};
 const removeExpense=id=>{const next=expenses.filter(x=>x.id!==id);setExpenses(next);localStorage.setItem('shopeasy-admin-expenses',JSON.stringify(next))};
 const saveUpi=e=>{e.preventDefault();localStorage.setItem('shopeasy-upi-id',upiId.trim());localStorage.setItem('shopeasy-upi-name',upiName.trim()||'ShopEasy');setUpiSaved(true);setTimeout(()=>setUpiSaved(false),2500)};
 const paidOrders=orders.filter(o=>String(o.status||'').toLowerCase()==='delivered');
 const totalOrderValue=orders.reduce((sum,o)=>sum+Number(o.total||0),0);
 const deliveredValue=paidOrders.reduce((sum,o)=>sum+Number(o.total||0),0);
 const totalExpenses=expenses.reduce((sum,x)=>sum+Number(x.amount||0),0);
 const profit=deliveredValue-totalExpenses;
 const bestSellers=useMemo(()=>{const map={};orders.forEach(o=>(Array.isArray(o.items)?o.items:[]).forEach(item=>{const key=String(item.id ?? item.name ?? "unknown");if(!map[key])map[key]={name:item.name||'Product',qty:0,revenue:0};map[key].qty+=Number(item.qty||0);map[key].revenue+=Number(item.price||0)*Number(item.qty||0)}));return Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,6)},[orders]);
 const lastSeven=useMemo(()=>Array.from({length:7},(_,idx)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(6-idx));const next=new Date(d);next.setDate(next.getDate()+1);const list=orders.filter(o=>{const t=Number(o.created||0);return t>=d.getTime()&&t<next.getTime()});return {label:d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}),orders:list.length,sales:list.reduce((sum,o)=>sum+Number(o.total||0),0)}}),[orders]);
 const maxSales=Math.max(1,...lastSeven.map(d=>d.sales));
 const qrValue=upiId.trim()?`upi://pay?pa=${encodeURIComponent(upiId.trim())}&pn=${encodeURIComponent(upiName.trim()||'ShopEasy')}${upiAmount&&Number(upiAmount)>0?`&am=${encodeURIComponent(Number(upiAmount).toFixed(2))}`:''}&cu=INR`:'';
 return <section className="admin-panel">
  <div className="admin-dashboard-head"><div><p className="admin-eyebrow">SHOPEASY CONTROL CENTER</p><h1>Admin Dashboard</h1><p className="admin-subtitle">Store performance, orders aur delivery operations ek jagah.</p></div><button type="button" className="btn" onClick={()=>{onRefresh();loadOrders()}} disabled={ordersBusy}>{ordersBusy?'RefreshingÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½':'ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½  Refresh data'}</button></div>
  <div className="tabs admin-tabs">
   <button className={tab==='dashboard'?'on':''} onClick={()=>setTab('dashboard')}>Dashboard</button>
   <button className={tab==='products'?'on':''} onClick={()=>setTab('products')}>Products ({products.length})</button>
   <button className={tab==='orders'?'on':''} onClick={()=>{setTab('orders');loadOrders()}}>Orders ({orders.length})</button>
   <button className={tab==='riders'?'on':''} onClick={()=>setTab('riders')}>Delivery partners ({riders.length})</button>
   <button className={tab==='finance'?'on':''} onClick={()=>setTab('finance')}>Income & Expense</button>
   <button className={tab==='upi'?'on':''} onClick={()=>setTab('upi')}>UPI QR Settings</button>
  </div>
  {err&&<p className="err" role="alert">{err}</p>}

  {tab==='dashboard'&&<div className="admin-dashboard">
   <div className="dashboard-welcome"><div><span>STORE OVERVIEW</span><h2>Good business starts with a clear view.</h2><p>Yahan se orders, product catalogue aur delivery team monitor karein.</p></div><div className="dashboard-date">{new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</div></div>
   <div className="dashboard-cards">
    <article className="dashboard-stat stat-green"><span>Total order value</span><strong>{rupee(totalOrderValue)}</strong><small>{orders.length} total orders</small></article>
    <article className="dashboard-stat stat-blue"><span>Delivered sales</span><strong>{rupee(deliveredValue)}</strong><small>{paidOrders.length} delivered orders</small></article>
    <article className="dashboard-stat stat-orange"><span>Products</span><strong>{products.length}</strong><small>In your catalogue</small></article>
    <article className="dashboard-stat stat-purple"><span>Delivery partners</span><strong>{riders.length}</strong><small>{riders.filter(r=>r.active).length} active partners</small></article>
   </div>
   <div className="dashboard-grid">
    <section className="dashboard-card dashboard-chart"><div className="dashboard-card-head"><div><h3>Sales & Orders</h3><p>Last 7 days - based on order creation date</p></div><button className="link" onClick={()=>{setTab('orders');loadOrders()}}>View orders ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½Ãƒâ€šÃ‚Â ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢</button></div>
     <div className="dashboard-bars">{lastSeven.map(d=><div className="dashboard-bar-col" key={d.label} title={`${d.label}: ${rupee(d.sales)} - ${d.orders} orders`}><span className="dashboard-bar-value">{d.sales?rupee(d.sales):'?0'}</span><div className="dashboard-bar-track"><div className="dashboard-bar" style={{height:`${Math.max(d.sales?5:0,(d.sales/maxSales)*100)}%`}}/></div><b>{d.label}</b><small>{d.orders} orders</small></div>)}</div>
    </section>
    <section className="dashboard-card"><div className="dashboard-card-head"><div><h3>Best-selling products</h3><p>Ranked by units in recorded orders</p></div></div>
     {bestSellers.length?<div className="dashboard-best-list">{bestSellers.map((p,i)=><div className="dashboard-best-item" key={p.name+'-'+i}><span className="dashboard-rank">{i+1}</span><div><b>{p.name}</b><small>{p.qty} units sold</small></div><strong>{rupee(p.revenue)}</strong></div>)}</div>:<p className="dashboard-empty">Orders aane ke baad best-selling products yahan dikhenge.</p>}
    </section>
   </div>
   <div className="dashboard-grid dashboard-grid-bottom">
    <section className="dashboard-card"><div className="dashboard-card-head"><div><h3>Recent orders</h3><p>Latest orders from your store</p></div><button className="link" onClick={()=>{setTab('orders');loadOrders()}}>All orders ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½Ãƒâ€šÃ‚Â ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢</button></div>
     {orders.length?<div className="dashboard-recent">{[...orders].sort((a,b)=>Number(b.created||0)-Number(a.created||0)).slice(0,5).map(o=><div className="dashboard-recent-row" key={o.id}><div><b>Order #{o.id}</b><small>{o.name||o.phone||'Customer'} - {o.created?new Date(Number(o.created)).toLocaleDateString('en-IN'):'Date unavailable'}</small></div><span className={'dashboard-status status-'+String(o.status||'placed').toLowerCase().replace(/[^a-z0-9_-]/g,'')}>{o.status||'placed'}</span><strong>{rupee(o.total)}</strong></div>)}</div>:<p className="dashboard-empty">{ordersBusy?'Orders load ho rahe hainÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½':'Abhi koi order nahi hai.'}</p>}
    </section>
    <section className="dashboard-card"><div className="dashboard-card-head"><div><h3>Quick actions</h3><p>Common store management tasks</p></div></div>
     <div className="dashboard-quick-actions"><button onClick={()=>{setEdit({});setTab('products')}}><span>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹</span><div><b>Add product</b><small>Catalogue mein naya product add karein</small></div></button><button onClick={()=>setTab('riders')}><span>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½Ãƒâ€šÃ‚Â ?</span><div><b>Manage riders</b><small>Delivery partner add ya remove karein</small></div></button><button onClick={()=>setTab('finance')}><span>?</span><div><b>Record expense</b><small>Store expense aur profit dekhein</small></div></button><button onClick={()=>setTab('upi')}><span>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½</span><div><b>UPI QR settings</b><small>Payment QR generate karein</small></div></button></div>
    </section>
   </div>
   <p className="dashboard-disclaimer">Note: Delivered sales yahan delivered orders ke total se calculate hoti hain. Expenses browser ke is device par save hote hain. Yeh dashboard abhi accounting software ya bank reconciliation ka replacement nahi hai.</p>
  </div>}

  {tab==='products'&&<><div className="sechead"><h2>Manage products</h2><button className="btn" onClick={()=>setEdit({})}>+ Add product</button></div>{edit&&<ProductForm initial={edit.id?edit:null} onSave={save} onCancel={()=>setEdit(null)} busy={busy}/>}
   <div className="admin-products">{products.map(p=><article className="admin-product" key={p.id}><img src={p.image||p.originalImage} alt={p.name}/><div className="admin-product-info"><b>{p.name}</b><span>{p.category} - {rupee(p.price)}</span><div className="admin-actions"><button className="link" onClick={()=>setEdit({...p,image:p.originalImage||p.image})}>Edit</button><label className="link upload-label">Photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>photo(p,e.target.files?.[0])} hidden/></label>{p.hasCustomImage&&<button className="link" onClick={()=>resetPhoto(p)}>Original</button>}<button className="link danger" onClick={async()=>{if(confirm(`Delete ${p.name}?`)){try{await api('/admin/products/'+p.id,'DELETE');await onRefresh()}catch(e){setErr(e.message)}}}}>Delete</button></div>{photoBusy===p.id&&<small>Uploading photoÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½</small>}</div></article>)}</div>
  </>}

  {tab==='orders'&&<><div className="sechead"><h2>Order management</h2><button className="btn" onClick={loadOrders} disabled={ordersBusy}>{ordersBusy?'LoadingÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½':'Refresh orders'}</button></div>{ordersBusy&&!orders.length?<p className="empty">Orders load ho rahe hainÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÂ¯Ã‚Â¿Ã‚Â½?ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½</p>:<Orders user={{role:'admin'}} riders={riders} reload={()=>{onRefresh();loadOrders()}}/>}</>}

  {tab==='riders'&&<><h2>Add delivery partner</h2><form className="admin-form" onSubmit={addRider}><label>Name<input value={rider.name} onChange={e=>setRider({...rider,name:e.target.value})} required/></label><label>Phone<input inputMode="numeric" maxLength={10} value={rider.phone} onChange={e=>setRider({...rider,phone:e.target.value})} required/></label><label>Initial password (8+ chars)<input type="password" minLength={8} value={rider.password} onChange={e=>setRider({...rider,password:e.target.value})} required/></label><label>Photo URL (optional)<input type="url" value={rider.photo} onChange={e=>setRider({...rider,photo:e.target.value})}/></label><button className="btn">Add rider</button></form><div className="admin-products">{riders.map(r=><article className="admin-product" key={r.id}>{r.photo?<img src={r.photo} alt={r.name}/>:<span className="rider-ph"><Ic n="rider" s={34}/></span>}<div className="admin-product-info"><b>{r.name}</b><span>{r.phone} - {r.active?'Active':'Inactive'}</span><button className="link danger" onClick={async()=>{if(confirm('Rider remove karein?')){try{await api('/admin/riders/'+r.id,'DELETE');setRiders(await api('/admin/riders'))}catch(e){setErr(e.message)}}}}>Remove rider</button></div></article>)}</div></>}

  {tab==='finance'&&<div className="admin-finance"><div className="sechead"><div><h2>Income & Expense</h2><p className="admin-subtitle">Delivered order value minus manually recorded expenses.</p></div></div>
   <div className="dashboard-cards finance-cards"><article className="dashboard-stat stat-green"><span>Delivered sales</span><strong>{rupee(deliveredValue)}</strong><small>{paidOrders.length} delivered orders</small></article><article className="dashboard-stat stat-orange"><span>Total expenses</span><strong>{rupee(totalExpenses)}</strong><small>{expenses.length} entries saved on this device</small></article><article className={'dashboard-stat '+(profit>=0?'stat-blue':'stat-red')}><span>Estimated balance</span><strong>{rupee(profit)}</strong><small>Sales minus listed expenses</small></article></div>
   <section className="dashboard-card finance-entry"><h3>Add expense</h3><form className="admin-expense-form" onSubmit={addExpense}><label>Expense amount (?)<input type="number" min="1" step="0.01" value={expense} onChange={e=>setExpense(e.target.value)} placeholder="e.g. 500" required/></label><button className="btn">Save expense</button></form><p className="hint">Expense entries local browser storage mein save hoti hain, server ya doosre devices par sync nahi hoti.</p></section>
   <section className="dashboard-card"><div className="dashboard-card-head"><div><h3>Expense history</h3><p>Newest entries first</p></div></div>{expenses.length?<div className="dashboard-recent">{expenses.map(x=><div className="dashboard-recent-row" key={x.id}><div><b>Store expense</b><small>{new Date(x.created).toLocaleString('en-IN')}</small></div><strong>{rupee(x.amount)}</strong><button className="link danger" onClick={()=>removeExpense(x.id)}>Remove</button></div>)}</div>:<p className="dashboard-empty">Abhi koi expense record nahi hai.</p>}</section>
  </div>}

  {tab==='upi'&&<div className="admin-upi"><div className="sechead"><div><h2>UPI QR Settings</h2><p className="admin-subtitle">Customer payment ke liye UPI QR banayein.</p></div></div>
   <div className="dashboard-grid"><section className="dashboard-card"><h3>Payment details</h3><form className="admin-form" onSubmit={saveUpi}><label>UPI ID / VPA<input value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="yourname@bank" required pattern="[A-Za-z0-9._-]+@[A-Za-z0-9.-]+" title="Valid UPI ID daalein, jaise name@bank"/></label><label>Payee name<input value={upiName} onChange={e=>setUpiName(e.target.value)} placeholder="ShopEasy" maxLength={60} required/></label><label>Optional payment amount (?)<input type="number" min="1" step="0.01" value={upiAmount} onChange={e=>setUpiAmount(e.target.value)} placeholder="Blank = customer enters amount"/></label><button className="btn">Save UPI settings</button>{upiSaved&&<p className="success">UPI settings is browser mein save ho gayi.</p>}</form><p className="hint">Settings isi browser ke local storage mein save hoti hain. Isse backend payment gateway ya checkout automatically configure nahi hota.</p></section>
    <section className="dashboard-card upi-preview"><h3>QR preview</h3>{qrValue?<><div className="upi-qr-wrap"><img alt="UPI payment QR code" src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrValue)}`}/></div><b>{upiName||'ShopEasy'}</b><p>{upiId}</p>{upiAmount&&Number(upiAmount)>0&&<strong>{rupee(upiAmount)}</strong>}<button className="btn" type="button" onClick={()=>window.open(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrValue)}`,'_blank','noopener,noreferrer')}>Open high-resolution QR</button></>:<p className="dashboard-empty">QR dekhne ke liye valid UPI ID enter karein.</p>}</section>
   </div>
  </div>}
 </section>;
}
async function downscaleJpeg(file){
 const img=await new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);resolve(i)};i.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Image open nahi hui'))};i.src=u});
 const scale=Math.min(1,700/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
 let quality=.86,blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',quality));
 while(blob&&blob.size>700*1024&&quality>.45){quality-=.1;blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',quality))}
 if(!blob)throw new Error('JPEG convert nahi hua');return blob;
}


/* ================= MOBILE LAYOUT (Instamart-style) =================
   Sirf phone (screen <= 760px) par chalta hai. Desktop ka design bilkul wahi rehta hai.
   Colour badalna ho to styles.css mein .m-app ka --m-acc change karein. */
const useIsMobile=()=>{
 const q='(max-width: 760px)';
 const [m,setM]=useState(()=>typeof window!=='undefined'&&window.matchMedia(q).matches);
 useEffect(()=>{const mq=window.matchMedia(q),f=()=>setM(mq.matches);f();mq.addEventListener?mq.addEventListener('change',f):mq.addListener(f);return()=>{mq.removeEventListener?mq.removeEventListener('change',f):mq.removeListener(f)}},[]);
 return m;
};
const MGROUPS=[
 ['Grocery & Kitchen',['Fruits & Vegetables','Dairy & Bakery','Atta, Rice & Dals','Masala & Spices','Cooking Essentials','Snacks & Beverages']],
 ['Beauty & Wellness',['Personal Care','Beauty & Cosmetics','Health & Wellness','Baby Care']],
 ['Household & Lifestyle',['Home Care & Cleaning','Kitchen & Dining','Pet Care','Stationery & Office','Electronics & Accessories','Festive & Gifts']],
 ['Fashion & More',['Fashion & Accessories','Automotive & Hardware','Toys & Games','Books & More']]
];
const BAN_BG=['linear-gradient(120deg,#4a0d1e,#a3202f 55%,#d9661c)','linear-gradient(120deg,#5a1a05,#b4440c 55%,#eb9a2e)','linear-gradient(120deg,#3d1a52,#7a2e7e 55%,#d0562f)','linear-gradient(120deg,#0a4626,#0e6a38 55%,#34a063)','linear-gradient(120deg,#7a3a06,#c8710e 60%,#f0b23c)','linear-gradient(120deg,#0b3d6b,#1c6bb5 60%,#4aa3e0)'];
const BANNERS=[...SLIDES.map(s=>({t:s.title,e:s.eyebrow,off:s.off,g:s.g,f:s.f,k:s.k,serviceKind:s.serviceKind,image:s.image})),...SIDE_A.map(s=>({t:s.t,e:s.sub,off:s.off,g:s.g,f:s.f,k:s.k})),...SIDE_B.map(s=>({t:s.t,e:s.sub,off:s.off,g:s.g,f:s.f,k:s.k}))];

function MobileApp(P){
 const {products,loading,q,onSearch,setQ,cart,add,lines,subtotal,count,user,view,setView,special,logout,setAuth,cartOpen,setCartOpen,dark,setDark,best,gi,overlays}=P;
 const [tab,setTab]=useState('home'),[mcat,setMcat]=useState(null),[dealCat,setDealCat]=useState('All'),[sOpen,setSOpen]=useState(false),[acct,setAcct]=useState(false),[bi,setBi]=useState(0);
 const ban=useRef(null),sref=useRef(null);
 useEffect(()=>{document.body.classList.add('m-body');return()=>document.body.classList.remove('m-body')},[]);
 useEffect(()=>{if(view==='admin')setSOpen(false)},[view]);
 useEffect(()=>{if(sOpen&&sref.current)sref.current.focus()},[sOpen]);
 /* banner auto-slide */
 useEffect(()=>{const el=ban.current;if(!el||tab!=='home'||sOpen||special)return;const id=setInterval(()=>{const w=el.firstChild?el.firstChild.offsetWidth+10:0;if(!w)return;const n=Math.round(el.scrollLeft/w);el.scrollTo({left:((n+1)%BANNERS.length)*w,behavior:'smooth'})},4500);return()=>clearInterval(id)},[tab,sOpen,special,loading]);
 const top=()=>window.scrollTo(0,0);
 const toTab=t=>{setView('shop');setQ('');setSOpen(false);setTab(t);if(t!=='cats')setMcat(null);top()};
 const openCat=n=>{setView('shop');setQ('');setSOpen(false);setTab('cats');setMcat(n);top()};
 const closeSearch=()=>{setSOpen(false);setQ('')};
 const dealsAll=useMemo(()=>products,[products]);

 const card=p=>{const off=offPct(p),n=cart[p.id]||0;return <article className="mpc" key={p.id}>
  <div className="mpc-img"><img src={resolveImageUrl(p.image||p.originalImage)} alt={p.name} loading="lazy" onError={e=>{e.currentTarget.style.visibility='hidden'}}/>
   {n?<div className="mstep"><button aria-label="Decrease" onClick={()=>add(p.id,-1)}>-</button><span>{n}</span><button aria-label="Increase" onClick={()=>add(p.id,1)}>+</button></div>
   :<button className="madd" aria-label={'Add '+p.name} onClick={()=>add(p.id,1)}><Ic n="plus" s={18}/></button>}
  </div>
  <span className="mins"><Ic n="bolt" s={9}/>10 MINS</span>
  <h3>{p.name}</h3><p className="mu">{p.unit||p.category}</p>
  {off>0&&<p className="moff">{off}% OFF</p>}
  <p className="mpr"><b>{rupee(p.price)}</b>{off>0&&<s>{rupee(p.mrp)}</s>}</p>
 </article>};

 const section=(title,items,onAll)=>items.length?<section className="msec" key={title}><div className="msec-h"><h2>{title}</h2><button onClick={onAll}>See All -</button></div><div className="mrow">{items.slice(0,10).map(card)}</div></section>:null;

 const sideBtn=(key,label,node,on,fn)=><button key={key} className={on?'on':''} onClick={()=>{fn();const m=document.querySelector('.mmain');if(m)m.scrollTop=0}}><span>{node}</span><b>{label}</b></button>;
 const navSide=(sel,pick,withAll)=><aside className="mside" aria-label="Categories">
  {withAll&&sideBtn('All','All Deals',<Ic n="tag" s={22}/>,sel==='All',()=>pick('All'))}
  {NAV.map(([n,s])=>sideBtn(n,SHORT[n],<Pic f={`cat-${s}`} k={s} x={gi(n)} s={14}/>,sel===n,()=>pick(n)))}
 </aside>;

 /* ----- header + body ----- */
 let head,body;
 const titles={orders:'My orders',admin:'Admin',rider:'Delivery partner',services:'Special Services',serviceAdmin:'Service Requests'};
 if(special){
  head=<header className="mh"><button aria-label="Back" onClick={()=>setView('shop')}><Ic n="chevL" s={22}/></button><div className="mh-t"><b>{titles[view]||'ShopEasy'}</b></div></header>;
  body=<main className="plain m-plain">{special}</main>;
 }else if(sOpen){
  const res=q.trim()?products.filter(p=>(p.name+' '+p.category).toLowerCase().includes(q.trim().toLowerCase())):null;
  head=<header className="mh"><button aria-label="Back" onClick={closeSearch}><Ic n="chevL" s={22}/></button><input ref={sref} className="msearch" type="search" value={q} onChange={onSearch} placeholder="Search for products, brands and more" aria-label="Search products" autoComplete="off"/></header>;
  body=<main className="msr">{!res?<p className="mhint">Product ya brand ka naam likhein</p>:res.length?<div className="mgrid">{res.map(card)}</div>:<p className="mhint">Koi product nahi mila.</p>}</main>;
 }else{
  const right=<div className="mh-r" style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"10px",flexShrink:0,minWidth:"fit-content"}}><button aria-label="Search" style={{flex:"0 0 38px",width:"38px",minWidth:"38px",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setSOpen(true)}><Ic n="search" s={22}/></button>{!user && tab==='home'
  ? <button type="button" aria-label="Login" onClick={()=>setAuth(true)} style={{flex:'0 0 68px',width:'68px',minWidth:'68px',maxWidth:'68px',boxSizing:'border-box',padding:'9px 8px',display:'inline-flex',alignItems:'center',justifyContent:'center',borderRadius:'20px',border:'none',background:'#16a34a',color:'#fff',fontWeight:700,fontSize:'14px',whiteSpace:'nowrap',overflow:'visible',cursor:'pointer'}}>Login</button>
  : <button aria-label="Account" onClick={()=>setAcct(true)}><Ic n="user" s={22}/></button>}</div>;
  if(tab==='home'){
   head=<header className="mh"><div className="mh-t"><div style={{display:"flex",alignItems:"center",gap:"7px"}}><img src="/shopeasy-logo.png" alt="ShopEasy Logo" style={{width:"47px",height:"47px",objectFit:"contain",flexShrink:0}}/><div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",justifyContent:"center",gap:"2px"}}><b>ShopEasy</b><small style={{display:"flex",alignItems:"center",gap:"4px",margin:0,fontSize:"10px",lineHeight:"1.3",whiteSpace:"nowrap"}}><Ic n="bolt" s={11}/>10 MINS delivery - Merta Road</small></div></div></div>{right}</header>;
   body=<main>
    {!!products.length&&<><div className="mban" ref={ban} onScroll={e=>{const el=e.currentTarget,w=el.firstChild?el.firstChild.offsetWidth+10:1;setBi(Math.round(el.scrollLeft/w))}}>
     {BANNERS.map((b,i)=><button key={b.t} className={'mb'+(b.serviceKind?' mb-service':'')} style={{background:BAN_BG[i%BAN_BG.length]}} onClick={()=>b.serviceKind?P.openService(b.serviceKind):openCat(b.g)}>
      {b.image?<img className="mb-service-img" src={b.image} alt={b.t} style={{display:"block",width:"100%",height:"100%",minHeight:150,objectFit:"cover"}}/>:<><span className="mb-t"><em>{b.e}</em><b>{b.t}</b><strong>{b.off}</strong><i>Shop Now</i></span><span className="mb-i"><Pic f={b.f} k={b.k} x={gi(b.g)}/></span></>}</button>)}
     </div><p className="mcount"><span>{Math.min(bi+1,BANNERS.length)}/{BANNERS.length}</span></p></>}
    <div className="mcs-row" aria-label="Categories">{NAV.map(([n,s,,bg])=><button key={n} className="mcs" onClick={()=>openCat(n)}><span style={{background:bg}}><Pic f={`cat-${s}`} k={s} x={gi(n)}/></span><b>{SHORT[n]}</b></button>)}</div>
    {loading?<p className="mhint">Products load ho rahe hain...</p>:!products.length?<p className="mhint">Product catalogue abhi khaali hai.</p>:<>
     {section('Best Selling',best,()=>{setDealCat('All');toTab('deals')})}
     {NAV.map(([n])=>section(n,products.filter(p=>inGroup(p,n)),()=>openCat(n)))}
    </>}
    <p className="mtag">Fresh Products. Faster Delivery. Happier Homes.</p>
   </main>;
  }else if(tab==='cats'&&!mcat){
   head=<header className="mh"><div className="mh-t"><b>Categories</b></div>{right}</header>;
   body=<main className="mcg">{MGROUPS.map(([g,names])=><section key={g}><h2>{g}</h2><div className="mcg-g">{names.map(n=>{const x=NAV.find(r=>r[0]===n);return x&&<button key={n} className="mct" onClick={()=>openCat(n)}><span style={{background:x[3]}}><Pic f={`cat-${x[1]}`} k={x[1]} x={gi(n)}/></span><b>{SHORT[n]}</b></button>})}</div></section>)}</main>;
  }else if(tab==='cats'){
   const items=products.filter(p=>inGroup(p,mcat));
   head=<header className="mh"><button aria-label="Back" onClick={()=>{setMcat(null);top()}}><Ic n="chevL" s={22}/></button><div className="mh-t"><b>{mcat}</b><small className="sub">{items.length} items</small></div>{right}</header>;
   body=<div className="mlist">{navSide(mcat,setMcat)}<main className="mmain">
{mcat === 'Fast Food' && <div className="fastfood-status" role="status">
  <style>{`
    .fastfood-status{display:flex!important;align-items:flex-start;gap:10px;width:100%;box-sizing:border-box;padding:12px;margin:0 0 14px;border:1px solid #b7e4c7;border-radius:12px;background:#effaf2;color:#174b2b;font-size:13px;line-height:1.5;overflow-wrap:anywhere}
    .fastfood-status .ff-dot{display:block;flex:0 0 11px;width:11px;height:11px;margin-top:4px;border-radius:50%;background:#16a34a;animation:ffPulseMobile 1.4s infinite}
    .fastfood-status strong{display:block;margin-bottom:3px}
    @keyframes ffPulseMobile{0%{box-shadow:0 0 0 0 rgba(22,163,74,.55)}70%{box-shadow:0 0 0 8px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}
  `}</style>
  <span className="ff-dot" aria-hidden="true"></span>
  <div><strong>Fast Food ? preparation status</strong>
  Fast food order prepare hone mein samay lag sakta hai. Delivery sirf item available hone aur order confirm hone ke baad hi possible hogi.</div>
</div>}
<p className="mcount-t">{items.length} items in {SHORT[mcat]}</p>{items.length?<div className="mgrid">{items.map(card)}</div>:<p className="mhint">Is category mein abhi products nahi hain.</p>}</main></div>;
  }else{
   const items=dealCat==='All'?dealsAll:dealsAll.filter(p=>inGroup(p,dealCat));
   head=<header className="mh"><div className="mh-t"><b>Top Deals</b><small className="sub">{dealsAll.length} items</small></div>{right}</header>;
   body=<div className="mlist deals-list">{navSide(dealCat,setDealCat,true)}<main className="mmain"><p className="mcount-t">{items.length} items in {dealCat==='All'?'All Deals':SHORT[dealCat]}</p>{items.length?<div className="mgrid">{items.map(card)}</div>:<p className="mhint">Is category mein abhi deals nahi hain.</p>}</main></div>;
  }
 }

 const tabs=[['home','home','Home'],['cats','grid','Categories'],['deals','tag','Top Deals']];
 return <div className={'app m-app'+(dark?' dark':'')}>
  {head}{body}
  <nav className="mnav" aria-label="Main">
   {tabs.map(([k,ic,l])=><button key={k} className={!special&&!sOpen&&tab===k?'on':''} onClick={()=>toTab(k)}><span className="mni"><Ic n={ic} s={24}/></span><b>{l}</b></button>)}
   <button className={cartOpen?'on':''} onClick={()=>setCartOpen(true)}><span className="mni"><Ic n="cart" s={24}/>{count>0&&<em>{count}</em>}</span><b>Cart</b></button>
  </nav>
  {acct&&<div className="moverlay" onClick={()=>setAcct(false)}><div className="msheet" onClick={e=>e.stopPropagation()} role="dialog" aria-label="Account">
   <h3>{user?user.name||'My account':'Welcome to ShopEasy'}</h3>
   {!user&&<button className="mb-primary" onClick={()=>{setAcct(false);setAuth(true)}}>Login / Sign up</button>}
   {user?.role==='customer'&&<><button onClick={()=>{setAcct(false);setView('orders')}}>My orders</button><button onClick={()=>{setAcct(false);setView('services')}}>Train / Gas Services</button></>}
   {user?.role==='admin'&&<><button onClick={()=>{setAcct(false);setView('admin')}}>Admin dashboard</button><button onClick={()=>{setAcct(false);setView('serviceAdmin')}}>Special service requests</button></>}
   {user?.role==='rider'&&<button onClick={()=>{setAcct(false);setView('rider')}}>Delivery orders</button>}
   <button onClick={()=>setDark(!dark)}>{dark?'Light mode':'Dark mode'}</button>
   {user&&<button className="mdanger" onClick={()=>{setAcct(false);logout()}}>Logout</button>}
  </div></div>}
  {overlays}
 </div>;
}


function ServiceCenter({ user, toast, initialKind='train-food', onLoginRequired }) {
 const [kind,setKind]=useState(initialKind);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [mine,setMine]=useState([]);
 const [form,setForm]=useState({name:user?.name||'',phone:user?.phone||'',trainNo:'',trainName:'',departure:'',leadMinutes:'30',pnr:'',coach:'',seat:'',items:'',senderName:'',senderPhone:'',receiverName:'',receiverPhone:'',parcelType:'',parcelDescription:'',gasDay:'',gasLocation:'',gasAddress:'',gasService:'route'});
 const schedule=[
  ['Monday','Holiday'],['Tuesday','100 Gate'],['Wednesday','Near Baiyansa Temple'],
  ['Thursday','Senior Secondary School'],['Friday','Near Baiyansa Temple'],
  ['Saturday','Senior Secondary School'],['Sunday','Badaliya Bera']
 ];
 const load=async()=>{try{const d=await api('/services/mine');setMine(Array.isArray(d)?d:[])}catch(e){setError(e.message)}};
 useEffect(()=>{if(user?.role==='customer')load()},[user?.phone]);
 const change=(k,v)=>setForm(f=>({...f,[k]:v}));
 const submit=async e=>{
  e.preventDefault();
  setError('');

  if(!user || user?.role!=='customer'){
    setError('Booking se pehle Customer Login karein.');
    onLoginRequired?.(kind);
    return;
  }

  // Open a blank tab directly from the customer's button click.
  // This helps prevent browser popup blocking after the API request.


  setBusy(true);
  try{
    const payload={...form};

    if(kind==='train-food'){
      if(!form.trainNo.trim()||!form.departure||!form.coach.trim()||!form.seat.trim()||!form.items.trim())
        throw new Error('Train number, departure, coach, seat aur food details bharein.');

      const dep=new Date(form.departure).getTime();
      const min=Date.now()+Number(form.leadMinutes)*60000;

      if(!Number.isFinite(dep)||dep<min)
        throw new Error(`Booking train departure se kam se kam ${form.leadMinutes} minute pehle karein.`);
    }

    if(kind==='train-parcel'&&(!form.trainNo.trim()||!form.senderName.trim()||!form.senderPhone.trim()||!form.receiverName.trim()||!form.receiverPhone.trim()||!form.parcelDescription.trim()))
      throw new Error('Parcel aur sender/receiver ki sabhi zaroori details bharein.');

    if(kind==='gas'&&(!form.gasDay||!form.gasAddress.trim()))
      throw new Error('Delivery day aur complete address bharein.');

    const d=await api('/services/'+kind,'POST',payload);

    const serviceId=d.serviceId||('S-'+d.id);
    const serviceName=kind==='gas'
      ? 'GAS CYLINDER DELIVERY'
      : kind==='train-food'
        ? 'TRAIN FOOD DELIVERY'
        : 'TRAIN PARCEL DELIVERY';

    let details=[];

    if(kind==='gas'){
      details=[
        'Delivery day: '+form.gasDay,
        'Delivery location: '+form.gasLocation,
        'Delivery address: '+form.gasAddress,
        'Gas service: '+(form.gasService||'route'),
        'Delivery fee: Rs. '+Number(d.fee??0)
      ];
    }else if(kind==='train-food'){
      details=[
        'Train number: '+form.trainNo,
        'Train name: '+form.trainName,
        'Departure: '+form.departure,
        'PNR: '+(form.pnr||'Not provided'),
        'Coach: '+form.coach,
        'Seat: '+form.seat,
        'Food items: '+form.items,
        'Delivery fee: Rs. '+Number(d.fee??0)
      ];
    }else{
      details=[
        'Train number: '+form.trainNo,
        'Train name: '+form.trainName,
        'Sender: '+form.senderName,
        'Sender mobile: '+form.senderPhone,
        'Receiver: '+form.receiverName,
        'Receiver mobile: '+form.receiverPhone,
        'Parcel type: '+(form.parcelType||'-'),
        'Parcel details: '+form.parcelDescription,
        'Delivery fee: Rs. '+Number(d.fee??0)
      ];
    }

    const message=[
      'SHOPEASY - SPECIAL SERVICE BOOKING',
      '',
      'Service: '+serviceName,
      'Service ID: '+serviceId,
      'Customer: '+String(user.name||form.name||'Customer'),
      'Customer mobile: '+String(user.phone||form.phone||''),
      ...details,
      '',
      'Please confirm this delivery booking.',
      'Thank you - ShopEasy'
    ].join('\n');

    const waUrl='https://wa.me/918005711525?text='+encodeURIComponent(message);

    toast(d.message||'Booking request submit ho gayi.');

    // Redirect the prepared tab to WhatsApp.
    window.location.assign('https://wa.me/918005711525?text='+encodeURIComponent(message));

    await load();

    setForm(f=>({
      ...f,
      trainNo:'',
      trainName:'',
      departure:'',
      pnr:'',
      coach:'',
      seat:'',
      items:'',
      senderName:'',
      senderPhone:'',
      receiverName:'',
      receiverPhone:'',
      parcelType:'',
      parcelDescription:'',
      gasAddress:''
    }));

  }catch(e){

    setError(e.message);
  }finally{
    setBusy(false);
  }
};
 const fee=kind==='train-food'?30:kind==='gas'?(form.gasService==='agency'?50:30):'Admin set karega';
 return <section className="se-services">
  <style>{`.se-services{max-width:1000px;margin:0 auto;padding:18px;color:var(--text,#18231d)}.se-services h1{margin:0 0 8px}.se-service-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.se-service-tabs button,.se-services button{border:0;border-radius:10px;padding:11px 14px;cursor:pointer}.se-service-tabs button{background:#edf3ef;color:#234b34;font-weight:700}.se-service-tabs button.on{background:#167a45;color:#fff}.se-service-card{background:var(--card,#fff);border:1px solid #dce6df;border-radius:16px;padding:18px;margin:12px 0}.se-service-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.se-service-grid label{display:grid;gap:6px;font-size:13px;font-weight:650}.se-service-grid input,.se-service-grid select,.se-service-grid textarea{width:100%;box-sizing:border-box;padding:11px;border:1px solid #ccd8d0;border-radius:9px;background:transparent;color:inherit;font:inherit}.se-service-grid .wide{grid-column:1/-1}.se-service-submit{background:#16834a;color:white;font-weight:750;margin-top:14px}.se-service-fee{font-weight:750;color:#16834a}.se-service-error{color:#b42318}.se-service-item{border-top:1px solid #e5ebe7;padding:12px 0}.se-service-item small{display:block;color:#68766e;margin-top:4px}@media(max-width:600px){.se-service-grid{grid-template-columns:1fr}.se-service-grid .wide{grid-column:auto}}`}</style>
  <h1>ShopEasy Special Services</h1><p>Train aur gas cylinder services ? Merta Road ke liye.</p>
  <div className="se-service-tabs">
   <button className={kind==='train-food'?'on':''} onClick={()=>setKind('train-food')}>Train Food</button>
   <button className={kind==='train-parcel'?'on':''} onClick={()=>setKind('train-parcel')}>Train Parcel</button>
   <button className={kind==='gas'?'on':''} onClick={()=>setKind('gas')}>Gas Cylinder</button>
  </div>
  <form className="se-service-card" onSubmit={submit}>
   <h2>{kind==='train-food'?'Train Food Delivery':kind==='train-parcel'?'Train Parcel Delivery':'Gas Cylinder Delivery'}</h2>
   <p><b>Service location:</b> Merta Road Railway Station {kind!=='gas'?'only':'area'}</p>
   <p className="se-service-fee">Delivery fee: {typeof fee==='number'?rupee(fee):fee}</p>
   {kind!=='gas'&&<div className="se-service-grid">
    <label>Customer name<input value={form.name} onChange={e=>change('name',e.target.value)} required/></label>
    <label>Customer mobile<input inputMode="numeric" maxLength="10" value={form.phone} onChange={e=>change('phone',e.target.value)} required/></label>
    <label>Train number<input value={form.trainNo} onChange={e=>change('trainNo',e.target.value)} required/></label>
    <label>Train name<input value={form.trainName} onChange={e=>change('trainName',e.target.value)}/></label>
    {kind==='train-food'?<>
     <label>Train departure date & time<input type="datetime-local" value={form.departure} onChange={e=>change('departure',e.target.value)} required/></label>
     <label>Booking lead time<select value={form.leadMinutes} onChange={e=>change('leadMinutes',e.target.value)}><option value="30">30 minutes before</option><option value="60">1 hour before</option></select></label>
     <label>PNR number (optional)<input value={form.pnr} onChange={e=>change('pnr',e.target.value)}/></label>
     <label>Coach<input value={form.coach} onChange={e=>change('coach',e.target.value)} required/></label>
     <label>Seat / Berth<input value={form.seat} onChange={e=>change('seat',e.target.value)} required/></label>
     <label className="wide">Food items and quantity<textarea rows="3" value={form.items} onChange={e=>change('items',e.target.value)} required placeholder="Example: 2 veg thali, 1 water bottle"/></label>
    </>:<>
     <label>Sender name<input value={form.senderName} onChange={e=>change('senderName',e.target.value)} required/></label>
     <label>Sender mobile<input inputMode="numeric" maxLength="10" value={form.senderPhone} onChange={e=>change('senderPhone',e.target.value)} required/></label>
     <label>Receiver name<input value={form.receiverName} onChange={e=>change('receiverName',e.target.value)} required/></label>
     <label>Receiver mobile<input inputMode="numeric" maxLength="10" value={form.receiverPhone} onChange={e=>change('receiverPhone',e.target.value)} required/></label>
     <label>Coach / Seat<input value={form.coach} onChange={e=>change('coach',e.target.value)} placeholder="If known"/></label>
     <label>Parcel type<input value={form.parcelType} onChange={e=>change('parcelType',e.target.value)} placeholder="Document / box / other"/></label>
     <label className="wide">Parcel description<textarea rows="3" value={form.parcelDescription} onChange={e=>change('parcelDescription',e.target.value)} required/></label>
    </>}
   </div>}
   {kind==='gas'&&<div className="se-service-grid">
    <label>Customer name<input value={form.name} onChange={e=>change('name',e.target.value)} required/></label>
    <label>Mobile number<input inputMode="numeric" maxLength="10" value={form.phone} onChange={e=>change('phone',e.target.value)} required/></label>
    <label>Delivery day<select value={form.gasDay} onChange={e=>{change('gasDay',e.target.value);change('gasLocation',schedule.find(x=>x[0]===e.target.value)?.[1]||'')}} required><option value="">Select day</option>{schedule.map(([d])=><option key={d}>{d}</option>)}</select></label>
    <label>Delivery location<select value={form.gasLocation} onChange={e=>change('gasLocation',e.target.value)} required><option value="">Select location</option>{(schedule.find(x=>x[0]===form.gasDay)?.[1]==='Holiday'?[]:[schedule.find(x=>x[0]===form.gasDay)?.[1]]).filter(Boolean).map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Service type<select value={form.gasService} onChange={e=>change('gasService',e.target.value)}><option value="route">Listed route / location delivery ? ?30</option><option value="agency">Agency to home delivery ? ?50</option></select></label>
    <label className="wide">Complete home address<textarea rows="3" value={form.gasAddress} onChange={e=>change('gasAddress',e.target.value)} required placeholder="House number, street, landmark"/></label>
   </div>}
   {kind==='gas'&&<div className="se-service-card"><b>Weekly delivery schedule</b>{schedule.map(([d,l])=><div key={d} className="se-service-item"><b>{d}</b><small>{l}</small></div>)}</div>}
   {error&&<p className="se-service-error" role="alert">{error}</p>}
   <button className="se-service-submit" disabled={busy}>{busy?'Submitting...':'Submit booking request'}</button>
  </form>
  <section className="se-service-card"><h2>My service requests</h2>{mine.length?mine.map(x=><div className="se-service-item" key={x.id}><b>#{x.id} ? {x.type.replaceAll('-',' ').toUpperCase()}</b><span> ? {x.status}</span><small>{new Date(x.created).toLocaleString('en-IN')} ? Fee: {rupee(x.fee)}</small><small>{x.summary||''}</small></div>):<p>No special service requests yet.</p>}</section>
 </section>;
}

function ServiceAdmin({toast}) {
 const [items,setItems]=useState([]),[err,setErr]=useState(''),[parcelFee,setParcelFee]=useState('30');
 const load=async()=>{try{setItems(await api('/admin/services'));const cfg=await api('/admin/service-settings');setParcelFee(String(cfg.trainParcelFee??30))}catch(e){setErr(e.message)}};
 useEffect(()=>{load()},[]);
 const update=async(id,status)=>{try{await api('/admin/services/'+id,'PATCH',{status});await load();toast('Service request updated')}catch(e){setErr(e.message)}};
 const saveFee=async e=>{e.preventDefault();try{await api('/admin/service-settings','PUT',{trainParcelFee:Number(parcelFee)});toast('Train parcel fee saved')}catch(e){setErr(e.message)}};
 return <section className="se-services"><h1>Special Service Requests</h1>{err&&<p className="err">{err}</p>}
 <form className="se-service-card" onSubmit={saveFee}><h2>Train Parcel Delivery Fee</h2><label>Fee (?)<input type="number" min="0" max="10000" step="1" value={parcelFee} onChange={e=>setParcelFee(e.target.value)} required/></label><button className="btn">Save parcel fee</button></form>
 <button className="btn" onClick={load}>Refresh requests</button>{items.map(x=><article className="se-service-card" key={x.id}><b>#{x.id} ? {x.type.toUpperCase()} ? {x.status}</b><p>{x.name} ? {x.phone} ? Fee {rupee(x.fee)}</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(x.payload,null,2)}</pre><select value={x.status} onChange={e=>update(x.id,e.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="preparing">Preparing</option><option value="ready">Ready</option><option value="out_for_delivery">Out for delivery</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></article>)}</section>;
}

/* SPECIAL_SERVICE_RIDER_UI_V1 */
function RiderSpecialServices({toast}) {
 const [services,setServices]=useState([]);
 const [busy,setBusy]=useState('');
 const [otp,setOtp]=useState({});
 const [error,setError]=useState('');

 const load=async()=>{
  try{
   const rows=await api('/rider/services');
   setServices(Array.isArray(rows)?rows:[]);
   setError('');
  }catch(e){setError(e.message)}
 };

 useEffect(()=>{
  load();
  const timer=setInterval(load,8000);
  return ()=>clearInterval(timer);
 },[]);

 const act=async(id,action,body={})=>{
  const key=String(id)+':'+action;
  setBusy(key);
  try{
   const result=await api(`/rider/services/${id}/${action}`,'POST',body);
   toast(result.message||'Special service updated.');
   await load();
  }catch(e){toast(e.message);setError(e.message)}
  finally{setBusy('')}
 };

 const details=x=>{
  const p=x.payload||{};
  if(x.type==='gas')return [
   'Gas day: '+(p.gasDay||'-'),
   'Route: '+(p.gasLocation||'-'),
   'Address: '+(p.gasAddress||'-'),
   'Service: '+(p.gasService||'-')
  ];
  if(x.type==='train-food')return [
   'Train: '+(p.trainNo||'-')+' '+(p.trainName||''),
   'Coach: '+(p.coach||'-'),
   'Seat: '+(p.seat||'-'),
   'Food: '+(p.items||'-'),
   'Station: '+(p.station||'Merta Road Railway Station')
  ];
  return [
   'Train: '+(p.trainNo||'-')+' '+(p.trainName||''),
   'Sender: '+(p.senderName||'-')+' / '+(p.senderPhone||'-'),
   'Receiver: '+(p.receiverName||'-')+' / '+(p.receiverPhone||'-'),
   'Parcel: '+(p.parcelDescription||'-'),
   'Type: '+(p.parcelType||'-')
  ];
 };

 return <section className="se-service-card">
  <h2>Special Services - Rider Deliveries</h2>
  <p className="meta">Gas Cylinder, Train Food aur Train Parcel. Ye Grocery orders se alag hain.</p>
  {error&&<p className="err">{error}</p>}
  <button className="btn" type="button" onClick={load}>Refresh Special Services</button>
  {!services.length&&<p className="empty">Abhi koi Special Service delivery available nahi hai.</p>}
  {services.map(x=><article className="se-service-item" key={x.id}>
   <header>
    <b>{x.serviceId||('S-'+x.id)} - {String(x.type).replaceAll('-',' ').toUpperCase()}</b>
    <span>{x.available?'New request':x.status}</span>
   </header>
   <p><b>Customer:</b> {x.name} ({x.phone})</p>
   <p><b>Fee:</b> {rupee(x.fee)}</p>
   {details(x).map((v,i)=><p key={i}>{v}</p>)}
   {x.available?
    <button className="btn" disabled={!!busy} onClick={()=>act(x.id,'accept')}>Accept Special Service</button>
    :x.status==='confirmed'||x.status==='preparing'||x.status==='ready'?
    <button className="btn" disabled={!!busy} onClick={()=>act(x.id,'pickup')}>Start Delivery / Picked Up</button>
    :x.status==='out_for_delivery'?
    <div>
     <button className="btn" disabled={!!busy} onClick={()=>act(x.id,'send-delivery-otp')}>Send Service Email OTP</button>
     <label>Customer service OTP
      <input inputMode="numeric" maxLength="6" value={otp[x.id]||''}
       onChange={e=>setOtp(v=>({...v,[x.id]:e.target.value.replace(/\D/g,'').slice(0,6)}))}
       placeholder="6-digit OTP"/>
     </label>
     <button className="btn" disabled={!!busy||String(otp[x.id]||'').length!==6}
      onClick={()=>act(x.id,'complete',{otp:otp[x.id]})}>Verify OTP & Complete Service</button>
    </div>:null}
   <small>Created: {x.created?new Date(x.created).toLocaleString('en-IN'):'-'}</small>
  </article>)}
 </section>;
}

function ShopEasyMertaNotice() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <div className="shopeasy-merta-banner">
        <span aria-hidden="true">{"\u{1F69A}"}</span>
        Delivery available only in Merta Road, Nagaur, Rajasthan.
      </div>

      {open && (
        <div className="shopeasy-download-overlay">
          <section
            className="shopeasy-download-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shopeasy-download-title"
          >
            <img
              className="shopeasy-download-icon"
              src="/shopeasy-icon.png"
              alt="ShopEasy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <h2 id="shopeasy-download-title">ShopEasy</h2>
            <p>
              Shop easily in Merta Road. Install the ShopEasy app
              for a convenient shopping experience.
            </p>
            <div className="shopeasy-download-actions">
              <button
                type="button"
                className="shopeasy-cancel"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <a
                className="shopeasy-download"
                href="/downloads/ShopEasy.apk"
                download="ShopEasy.apk"
              >
                Download App
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
export default function App(){
 const isMobile=useIsMobile();
 const [products,setProducts]=useState([]),[loading,setLoading]=useState(true),[cat,setCat]=useState('All'),[q,setQ]=useState(''),[cart,setCart]=useState({}),[user,setUser]=useState(null),[view,setView]=useState('shop'),[auth,setAuth]=useState(false),[cartOpen,setCartOpen]=useState(false),[msg,setMsg]=useState(''),[addr,setAddr]=useState(''),[placing,setPlacing]=useState(false),[paymentMethod,setPaymentMethod]=useState("cod"),[deliveryQuote,setDeliveryQuote]=useState(null),[quoteLoading,setQuoteLoading]=useState(false),[riders,setRiders]=useState([]),[dark,setDark]=useState(false),[riderPhone,setRiderPhone]=useState(''),[riderPassword,setRiderPassword]=useState(''),[riderOrders,setRiderOrders]=useState([]),[cancelledOrders,setCancelledOrders]=useState([]),[riderEarnings,setRiderEarnings]=useState({deliveries:0,total:0,rate:5});
 const [tick,setTick]=useState(0),[paused,setPaused]=useState(false),[serviceKind,setServiceKind]=useState('train-food'),[pendingServiceKind,setPendingServiceKind]=useState('');
 const timer=useRef(null),toast=t=>{setMsg(t);setTimeout(()=>setMsg(''),2800)};
 const openService=kind=>{setServiceKind(kind);if(user?.role==='customer'){setView('services');window.scrollTo(0,0);return;}setPendingServiceKind(kind);setAuth(true);};
 const refresh=()=>api('/products').then(p=>setProducts(Array.isArray(p)?p:[])).catch(e=>toast(e.message)).finally(()=>setLoading(false));
 useEffect(()=>{refresh();api('/me').then(u=>{setUser(u);if(u?.role==='rider')setView('rider')}).catch(()=>{})},[]);
 useEffect(()=>{if(paused)return;const id=setInterval(()=>setTick(t=>t+1),4500);return()=>clearInterval(id)},[paused]);
 const unlock=async secret=>{try{const u=await api('/admin/unlock','POST',{secret});setUser(u);setView('admin');setQ('');toast('Admin unlocked')}catch{}};
 const onSearch=e=>{const v=e.target.value;setQ(v);setView(user?.role==='admin'?'admin':'shop');clearTimeout(timer.current);if(v.length>=10&&/[A-Za-z]/.test(v)&&/\d/.test(v))timer.current=setTimeout(()=>unlock(v),400)};
 const go=n=>{setCat(n);setQ('');setView('shop');window.scrollTo(0,0)};
 const results=q.trim()?products.filter(p=>(p.name+' '+p.category).toLowerCase().includes(q.trim().toLowerCase())):null;
 const best=useMemo(()=>{const d=products.filter(p=>offPct(p)>0);return (d.length>=4?d:products).slice(0,8)},[products]);
 const add=(id,d)=>setCart(c=>{const next={...c},n=(next[id]||0)+d;if(n<=0)delete next[id];else next[id]=Math.min(50,n);return next});
 const lines=products.filter(p=>cart[p.id]).map(p=>({...p,qty:cart[p.id]})),subtotal=lines.reduce((s,l)=>s+l.price*l.qty,0),count=lines.reduce((s,l)=>s+l.qty,0);
  const cartKey=lines.map(l=>l.id+':'+l.qty).join('|');
  const fee=deliveryQuote?.fee ?? 0;
  useEffect(()=>{
    if(user?.role!=='customer'||!lines.length){
      setDeliveryQuote(null);
      setQuoteLoading(false);
      return;
    }
    let active=true;
    setQuoteLoading(true);
    api('/orders/quote','POST',{items:lines.map(l=>({id:l.id,qty:l.qty})),address:addr})
      .then(q=>{if(active)setDeliveryQuote(q)})
      .catch(()=>{if(active)setDeliveryQuote(null)})
      .finally(()=>{if(active)setQuoteLoading(false)});
    return ()=>{active=false};
  },[user?.phone,cartKey,addr]);
 const card=p=>{const off=offPct(p);return <article className="pcard" key={p.id}>{off>0&&<span className="off">{off}% OFF</span>}<div className="pimg"><img src={resolveImageUrl(p.image||p.originalImage)} alt={p.name} loading="lazy" onError={e=>{e.currentTarget.style.visibility='hidden'}}/></div><h3>{p.name}</h3><p className="unit">{p.unit||p.category}</p><div className="price"><b>{rupee(p.price)}</b>{off>0&&<s>{rupee(p.mrp)}</s>}</div>{cart[p.id]?<div className="stepper"><button onClick={()=>add(p.id,-1)} aria-label="Decrease">-</button><span>{cart[p.id]}</span><button onClick={()=>add(p.id,1)} aria-label="Increase">+</button></div>:<button className="add" onClick={()=>add(p.id,1)}>Add</button>}</article>};
 const place=async()=>{
   if(!user){setAuth(true);return}
   if(paymentMethod==='online'){toast('Online payment gateway abhi setup nahi hai. COD select karein.');return}
   if(!lines.length){toast('Cart empty hai');return}
   setPlacing(true);
   try{
     const o=await api('/orders','POST',{
       address:addr,
       paymentMethod,
       items:lines.map(l=>({id:l.id,qty:l.qty}))
     });
     const doc=new (await import('jspdf')).jsPDF();
     let y=18;
     doc.setFontSize(20);
     doc.text('ShopEasy',14,y);
     y+=10;
     doc.setFontSize(15);
     doc.text('ORDER RECEIPT',14,y);
     y+=10;
     doc.setFontSize(10);
     doc.text('Order ID: '+String(o.id),14,y); y+=7;
     doc.text('Date: '+new Date().toLocaleString('en-IN'),14,y); y+=7;
     doc.text('Customer: '+String(user.name||user.phone||'Customer'),14,y); y+=7;
     doc.text('Phone: '+String(user.phone||'-'),14,y); y+=7;
     doc.text('Delivery address:',14,y); y+=6;
     const addressLines=doc.splitTextToSize(String(addr||'-'),180);
     doc.text(addressLines,14,y); y+=addressLines.length*5+5;
     doc.text('Payment: '+String(paymentMethod||'COD').toUpperCase(),14,y); y+=9;
     doc.text('Items',14,y); y+=7;
     for(const item of (o.items||lines)){
       const name=String(item.name||item.product?.name||item.title||'Item');
       const qty=Number(item.qty||1);
       const price=Number(item.price ?? item.product?.price ?? 0);
       const row=doc.splitTextToSize(name+' x '+qty+' - Rs. '+(price*qty).toFixed(2),180);
       if(y+row.length*5>275){doc.addPage();y=18}
       doc.text(row,14,y);y+=row.length*5+2;
     }
     y+=3;
     doc.setFontSize(13);
     doc.text('Total: Rs. '+Number(o.total||0).toFixed(2),14,y);
     y+=12;
     doc.setFontSize(10);
     doc.text('Thank you for shopping with ShopEasy!',14,y);
     doc.save('ShopEasy-Order-'+String(o.id)+'.pdf');
     const waItems = (Array.isArray(o.items) && o.items.length ? o.items : lines).map((i,n) => {
       const name = String(i.name || i.product?.name || i.title || 'Product');
       const unit = String(i.unit || i.product?.unit || '');
       const qty = Number(i.qty ?? 1);
       const price = Number(i.price ?? i.product?.price ?? 0);
       return (n+1)+'. '+name+(unit ? ' ('+unit+')' : '')+'\n   Quantity: '+qty+(unit ? ' '+unit : '')+'\n   Unit price: Rs. '+price.toFixed(2)+'\n   Item total: Rs. '+(price*qty).toFixed(2);
     });
     const waSubtotal = Number(o.subtotal ?? subtotal);
     const waFee = Number(o.delivery_fee ?? o.deliveryFee ?? fee ?? 0);
     const message = [
       'SHOPEASY - ORDER DETAILS',
       'Order ID: #'+String(o.id ?? 'N/A'),
       'Customer: '+String(user?.name || o.name || 'Customer'),
       'Phone: '+String(user?.phone || o.phone || 'N/A'),
       'Delivery address: '+String(o.address || addr || 'N/A'),
       '', 'PRODUCTS:', ...waItems, '',
       'Subtotal: Rs. '+waSubtotal.toFixed(2),
       'Delivery fee: '+(waFee===0 ? 'Free' : 'Rs. '+waFee.toFixed(2)),
       'Payment: '+String(o.payment || paymentMethod || 'COD').toUpperCase(),
       'Payment status: '+String(o.payment_status || 'Pending'),
       'GRAND TOTAL: Rs. '+Number(o.total ?? (waSubtotal+waFee)).toFixed(2),
       '', 'Thank you for shopping with ShopEasy!'
     ].join('\n');
     setCart({});
     setCartOpen(false);
     setView('orders');
     toast('Order placed! Receipt download ho rahi hai. WhatsApp khulega.');
     const waUrl='https://wa.me/918005711525?text='+encodeURIComponent(message);
    const waAppUrl = 'https://wa.me/918005711525?text=' + encodeURIComponent(message);
    const waWebUrl = 'https://wa.me/918005711525?text=' + encodeURIComponent(message);

    // Android mobile: WhatsApp app open karne ki koshish, browser fallback
    window.location.href = waAppUrl;
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.location.href = waWebUrl;
      }
    }, 1500);
   }catch(e){
     toast(e.message||'Order place nahi ho saka');
   }finally{
     setPlacing(false);
   }
 };
 const logout=async()=>{
    try {
      await api('/auth/logout','POST');
    } catch (error) {
      console.error('Logout request failed:', error.message);
    } finally {
      setUser(null);
      setRiderOrders([]);
      setCancelledOrders([]);
      setRiderPhone('');
      setRiderPassword('');
      setView('shop');
      setAuth(false);
      setCartOpen(false);
      toast('Logged out');
    }
  };
 useEffect(()=>{if(user?.role==='admin')api('/admin/riders').then(setRiders).catch(()=>{})},[user]);
 useEffect(()=>{if(user?.role!=='rider')return;const load=()=>api('/rider/orders').then(setRiderOrders).catch(()=>{});load();const id=setInterval(load,8000);return()=>clearInterval(id)},[user]);
 useEffect(()=>{if(user?.role!=='rider')return;const load=()=>api('/rider/earnings').then(setRiderEarnings).catch(()=>{});load();const id=setInterval(load,8000);return()=>clearInterval(id)},[user]);
 useEffect(()=>{
  if(user?.role!=='rider')return;
  let active=true;
  let previous=new Set();
  const loadCancelled=async()=>{
   try{
    const rows=await api('/rider/cancelled-orders');
    if(!active)return;
    const list=Array.isArray(rows)?rows:[];
    const current=new Set(list.map(o=>String(o.id)));
    const fresh=list.filter(o=>!previous.has(String(o.id)));
    if(previous.size&&fresh.length)toast('Cancellation alert: Order #'+fresh[0].id+' cancel ho gaya.');
    previous=current;
    setCancelledOrders(list);
   }catch{}
  };
  loadCancelled();
  const id=setInterval(loadCancelled,5000);
  return()=>{active=false;clearInterval(id)};
 },[user]);



 const riderView = (
  <>
   <div className="sechead">
    <h1>Delivery partner</h1>
    {user?.role === 'rider' && <p className="meta"><b>Delivery earnings:</b> Rs. {riderEarnings.total} - <b>Completed deliveries:</b> {riderEarnings.deliveries} - Rs. 5 per delivery</p>}
    {user?.role === 'rider' && <button className="btn" type="button" onClick={logout}>Logout</button>}
   </div>
   {!user || user.role !== 'rider' ? (
    <form className="admin-form" onSubmit={async e => {
     e.preventDefault();
     try {
      const u = await api('/rider/login', 'POST', { phone: riderPhone, password: riderPassword });
      setUser(u);
      setView('rider');
     } catch (x) { toast(x.message); }
    }}>
     <label>Rider phone<input value={riderPhone} onChange={e => setRiderPhone(e.target.value)} required /></label>
     <label>Password<input type="password" value={riderPassword} onChange={e => setRiderPassword(e.target.value)} required /></label>
     <button className="btn">Rider login</button>
    </form>
   ) : (
    <>
    <RiderSpecialServices toast={toast}/>
    <div className="orders">
     {riderOrders.length === 0 && <p className="empty">Abhi koi pending order nahi hai. Naye orders yahan automatically refresh honge.</p>}
     {riderOrders.map(o => (
      <article className="order" key={o.id}>
       <header><b>Order #{o.id}</b><span>{o.available ? 'New - Waiting for acceptance' : o.status}</span></header>
       <p>{o.address}</p>
       <ul>{o.items.map((i, j) => <li key={j}>{i.name}{i.unit||i.product?.unit ? ` ? ${i.unit||i.product?.unit}` : ""} ÃƒÂ¯Ã‚Â¿Ã‚Â½. Qty: {i.qty??1}{i.price!=null ? ` ÃƒÂ¯Ã‚Â¿Ã‚Â½. ${rupee(Number(i.price)*Number(i.qty??1))}` : ""}</li>)}</ul>
       {o.available ? (
        <button className="btn" onClick={async () => {
         try {
          await api('/rider/orders/' + o.id + '/accept', 'POST', {});
          toast('Order accepted!');
          setRiderOrders(await api('/rider/orders'));
         } catch (e) {
          toast(e.message);
          setRiderOrders(await api('/rider/orders').catch(() => []));
         }
        }}>Accept order</button>
       ) : (
        <>
         <p className="meta">
          {o.status === 'picked_up'
           ? 'Order customer ko deliver karein, phir Mark Delivered dabayein.'
           : 'Order accept ho gaya. Pehle parcel pickup karein.'}
         </p>
         <button className="btn" disabled={String(o.status).toLowerCase() === 'picked_up'} onClick={async () => {
          try {
           await api('/rider/orders/' + o.id + '/pickup', 'POST', {});
           toast('Order picked up');
           setRiderOrders(await api('/rider/orders'));
          } catch (e) { toast(e.message); }
         }}>Picked up</button>
         <button className="btn" disabled={String(o.status).toLowerCase() !== 'picked_up'} onClick={async () => {
          try {
            const sent = await api('/rider/orders/' + o.id + '/send-delivery-otp', 'POST', {});
            toast(sent.message || 'Confirmation OTP email par bhej diya.');
            const otp = window.prompt('Customer ke registered email par aaya 6-digit OTP enter karein:');
            if (otp === null) return;
            if (!/^\d{6}$/.test(otp.trim())) {
              toast('6-digit OTP enter karein.');
              return;
            }
            const result = await api('/rider/orders/' + o.id + '/complete', 'POST', { otp: otp.trim() });
            toast(result.message || 'Delivery verified successfully!');
            setRiderOrders(await api('/rider/orders'));
          } catch (e) {
            toast(e.message || 'OTP verification failed.');
            setRiderOrders(await api('/rider/orders').catch(() => []));
          }
         }}>Send Confirmation OTP &amp; Verify Delivery</button>
        </>
       )}
      </article>
     ))}
     <section className="cancelled-orders" aria-live="polite">
      <div className="sechead"><h2>Cancelled Orders</h2><span>{cancelledOrders.length} total</span></div>
      {cancelledOrders.length===0?<p className="empty">Abhi koi cancelled order nahi hai.</p>:cancelledOrders.map(o=>(
       <article className="order cancelled-order" key={'cancelled-'+o.id}>
        <header><b>Order #{o.id}</b><span>Cancelled</span></header>
        <p>Customer: {o.name} ({o.phone})</p>
        <p>{o.address}</p>
        <p>Reason: {o.cancellation_reason||'Not specified'}</p>
        <p>Amount: {rupee(o.total)}</p>
        <p className="meta">Cancelled at: {o.cancelled_at?new Date(o.cancelled_at).toLocaleString('en-IN'):'-'}</p>
       </article>
      ))}
     </section>
    </div>
   </>
  )}
 </>
);

 let special=null;
 if(view==='admin'&&user?.role==='admin')special=<Admin products={products} onRefresh={refresh} riders={riders} setRiders={setRiders}/>;
 else if(view==='services'&&user?.role==='customer')special=<ServiceCenter user={user} toast={toast} initialKind={serviceKind} onLoginRequired={kind=>{setPendingServiceKind(kind);setAuth(true);}}/>;
 else if(view==='serviceAdmin'&&user?.role==='admin')special=<ServiceAdmin toast={toast}/>;
 else if(view==='orders')special=<><h1>Your orders</h1><Orders user={user||{role:'customer'}}/></>;
 else if(view==='rider')special=riderView;

 const gi=n=>{const p=products.find(p=>inGroup(p,n)&&(p.image||p.originalImage));return p?(p.image||p.originalImage):undefined};
 const si=tick%SLIDES.length,sa=SIDE_A[tick%SIDE_A.length],sb=SIDE_B[tick%SIDE_B.length];
 const home=<>
  <section className="hero-row">
   <div className="hero-main slider" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} aria-roledescription="carousel">
    {SLIDES.map((s,i)=>{const prods=s.serviceKind?[]:products.filter(p=>inGroup(p,s.g)).slice(0,3);return <div key={s.title} className={'slide '+s.cls+(i===si?' on':'')} aria-hidden={i!==si}>
     {s.serviceKind?<button type="button" className="service-promo-slide" style={{position:"absolute",inset:0,width:"100%",height:"100%",padding:0,border:0,background:"transparent",cursor:"pointer",overflow:"hidden"}} tabIndex={i===si?0:-1} onClick={()=>openService(s.serviceKind)} aria-label={'Open '+s.title+' booking'}><img src={s.image} alt={s.title} style={{display:"block",width:"100%",height:"100%",objectFit:"cover"}}/></button>:<>{prods.length?<div className="slide-prods">{prods.map(p=>{const off=offPct(p);return <button key={p.id} className="sp" tabIndex={i===si?0:-1} onClick={()=>go(s.g)}><img src={p.image||p.originalImage} alt={p.name} loading="lazy" onError={e=>{e.currentTarget.style.visibility='hidden'}}/><b>{p.name}</b><span>{rupee(p.price)}{off>0&&<s>{rupee(p.mrp)}</s>}</span>{off>0&&<em>{off}% OFF</em>}</button>})}</div>:<Pic className="slide-photo" f={s.f} k={s.k} x={gi(s.g)}/>}
     <span className="eyebrow">{s.eyebrow}</span><h1>{s.title}</h1><strong>{s.off}</strong><p>{s.sub}</p><button className="shop-white" tabIndex={i===si?0:-1} onClick={()=>go(s.g)}>Shop Now -&gt;</button></>}
    </div>})}
    <button className="sl-arrow l" aria-label="Previous poster" onClick={()=>setTick(t=>t+SLIDES.length-1)}><Ic n="chevL" s={16}/></button>
    <button className="sl-arrow r" aria-label="Next poster" onClick={()=>setTick(t=>t+1)}><Ic n="chevR" s={16}/></button>
    <div className="sl-dots">{SLIDES.map((s,i)=><button key={s.title} className={i===si?'on':''} aria-label={'Poster '+(i+1)} onClick={()=>setTick(i)}/>)}</div>
   </div>
   <div className="hero-side side-a" key={'a'+sa.t}><h2>{sa.t}</h2><p>{sa.sub}</p><strong>{sa.off}</strong><button className="shop-orange" onClick={()=>go(sa.g)}>Shop Now</button><Pic className="art" f={sa.f} k={sa.k} x={gi(sa.g)}/></div>
   <div className="hero-side side-b" key={'b'+sb.t}><h2>{sb.t}</h2><p>{sb.sub}</p><strong>{sb.off}</strong><button className="shop-red" onClick={()=>go(sb.g)}>Shop Now</button><Pic className="art" f={sb.f} k={sb.k} x={gi(sb.g)}/></div>
  </section>

  <section className="strip" aria-label="Categories">{NAV.map(([n,s,,bg])=><button key={n} onClick={()=>go(n)}><span className="strip-ico" style={{background:bg}}><Pic f={`cat-${s}`} k={s} x={gi(n)}/></span><span>{SHORT[n]}</span></button>)}</section>

  <section className="features">
   <div className="feat f1"><Ic n="clock" s={30}/><p><b>10 Mins Delivery</b><small>On selected items</small></p></div>
   <div className="feat f2"><Ic n="tag" s={30}/><p><b>Best Prices</b><small>Lowest price guaranteed</small></p></div>
   <div className="feat f3"><Ic n="grid" s={30}/><p><b>Wide Selection</b><small>10,000+ products</small></p></div>
   <div className="feat f4"><Ic n="shield" s={30}/><p><b>Secure Payments</b><small>100% safe &amp; secure</small></p></div>
   <div className="feat f5"><Ic n="ret" s={30}/><p><b>Easy Returns</b><small>No questions asked</small></p></div>
  </section>

  {!!products.length&&<section className="best-wrap">
   <div className="sec-head"><h2>Best Selling Products</h2><button className="viewall" onClick={()=>go('*')}>View All -&gt;</button></div>
   <div className="best"><div className="best-row">{best.map(card)}</div>
    <div className="promo-side"><h3>Save Big on Monthly Groceries</h3><p>Combo Packs<br/><b>Up to 40% OFF</b></p><button className="shop-white" onClick={()=>go('*')}>Shop Now</button><Pic className="art" f="promo-basket" k="basket"/></div>
   </div>
  </section>}

  <section>
   <div className="sec-head"><h2>Category Highlights</h2></div>
   <div className="hl">{HIGHLIGHTS.map(([n,sub,bg,s,c])=><button key={n} className="hl-card" style={{background:bg}} onClick={()=>go(n)}><b>{n}</b><small>{sub}</small><Pic className="art" f={`hl-${s}`} k={s} x={gi(n)}/><i style={{background:c}}>Shop Now</i></button>)}</div>
  </section>

  <section className="promos">
   <div className="pr pr1"><Pic className="art" f="promo-app" icon="phone" s={30}/><p><b>Download ShopEasy App</b><small>Get exclusive offers and faster checkout</small><span className="stores"><button onClick={()=>toast('App jaldi aa raha hai')}>Google Play</button><button onClick={()=>toast('App jaldi aa raha hai')}>App Store</button></span></p></div>
   <div className="pr pr2"><Pic className="art" f="promo-gift" icon="gift" s={30}/><p><b>Refer &amp; Earn</b><small>Invite your friends and earn rewards</small><button className="pr-btn g" onClick={()=>toast('Refer & Earn jaldi aa raha hai')}>Invite Now</button></p></div>
   <div className="pr pr3"><Pic className="art" f="promo-festive" icon="tag" s={30}/><p><b>Festive Offers</b><small>Buy more, save more</small><button className="pr-btn r" onClick={()=>go('Festive & Gifts')}>Shop Now</button></p></div>
   <div className="pr pr4"><Pic className="art" f="promo-box" icon="box" s={30}/><p><b>Subscribe &amp; Save</b><small>Monthly essentials delivered to your door</small><button className="pr-btn b" onClick={()=>toast('Subscribe & Save jaldi aa raha hai')}>Learn More</button></p></div>
  </section>
 </>;

 let shop;
 if(loading)shop=<p className="empty">Products load ho rahe hain...</p>;
 else if(results)shop=<><h1>Search results</h1>{results.length?<div className="grid">{results.map(card)}</div>:<p className="empty">Koi product nahi mila.</p>}</>;
 else if(cat==='*')shop=<><button className="link back" onClick={()=>go('All')}> Home</button><h1>All products</h1>{products.length?<div className="grid">{products.map(card)}</div>:<p className="empty">Product catalogue abhi khaali hai.</p>}</>;
 else if(cat!=='All'){const items=products.filter(p=>inGroup(p,cat));shop=<><button className="link back" onClick={()=>go('All')}>- All categories</button><h1>{cat}</h1>{items.length?<div className="grid">{items.map(card)}</div>:<p className="empty">Is category mein abhi products nahi hain.</p>}</>}
 else shop=home;


 const overlays=<>
 {cartOpen&&<div className="overlay" onClick={()=>setCartOpen(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}><header className="cart-header"><button type="button" className="cart-home-btn" onClick={()=>{setCartOpen(false);setView('shop');}}><span aria-hidden="true">Ã¢â€ Â</span> Home</button><h2>Your cart</h2><button className="link" onClick={()=>setCartOpen(false)}>Close</button></header>{!lines.length?<>
<p className="empty">Cart khaali hai.</p>
<section style={{marginTop:20,paddingTop:16,borderTop:"1px solid #e5e7eb"}}>
  <h3 style={{fontSize:18,marginBottom:6}}>Budget Treats {"\u2728"}</h3>
  <p style={{fontSize:13,color:"#64748b",marginBottom:12}}>Chocolates, cakes, pastries aur snacks try karein</p>
  <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
    {(products.filter(p=>/chocolate|cake|pastr|biscuit|cookie|wafer|candy|sweet|snack/i.test(String(p.name||"")+" "+String(p.category||""))&&Number(p.price)<=150).length
      ? products.filter(p=>/chocolate|cake|pastr|biscuit|cookie|wafer|candy|sweet|snack/i.test(String(p.name||"")+" "+String(p.category||""))&&Number(p.price)<=150).slice(0,6)
      : [...products].filter(p=>Number(p.price)<=100).sort((a,b)=>Number(a.price)-Number(b.price)).slice(0,6)
    ).map(p=>
      <article key={p.id} style={{border:"1px solid #e2e8f0",borderRadius:10,padding:9,minWidth:0}}>
        <img src={p.image||p.originalImage} alt={p.name} loading="lazy"
          onError={e=>{e.currentTarget.style.visibility="hidden"}}
          style={{width:"100%",height:85,objectFit:"contain",borderRadius:6}}/>
        <div style={{fontSize:13,fontWeight:600,marginTop:6,overflowWrap:"anywhere"}}>{p.name}</div>
        <div style={{fontSize:14,fontWeight:700,margin:"6px 0"}}>{rupee(p.price)}</div>
        <button type="button" onClick={()=>add(p.id,1)}
          style={{width:"100%",padding:"8px 4px",border:0,borderRadius:7,background:"#07875b",color:"#fff",fontWeight:700,cursor:"pointer"}}>
          + Add
        </button>
      </article>
    )}
  </div>
</section>
</>:<><ul className="lines">{lines.map(l=><li key={l.id}><div><b>{l.name}</b><small>{l.unit} - {rupee(l.price)}</small></div><div className="stepper"><button onClick={()=>add(l.id,-1)}>-</button><span>{l.qty}</span><button onClick={()=>add(l.id,1)}>+</button></div></li>)}</ul><label className="addr">Delivery address<textarea rows={2} value={addr} onChange={e=>setAddr(e.target.value)} placeholder="House no., gali, landmark" required/></label><dl className="sum"><dt>Items</dt><dd>{rupee(subtotal)}</dd><dt>Delivery</dt><dd>{!user?'Login required':quoteLoading?'Calculating?':deliveryQuote? (fee?rupee(fee):'Free') : 'Unavailable'}</dd><dt>Total</dt><dd><b>{rupee(subtotal+fee)}</b></dd></dl><section className="payment-choice payment-choice-modern">
  <div className="payment-heading">
    <span className="payment-heading-icon">
      <Ic n="bag" s={23} />
    </span>
    <div>
      <h3>Payment method</h3>
      <p>Choose how you want to pay</p>
    </div>
  </div>

  <label
    className={`payment-card ${paymentMethod === "cod" ? "is-selected" : ""}`}
  >
    <span className="payment-card-icon cod-icon">
      <Ic n="bag" s={30} />
    </span>

    <span className="payment-card-content">
      <span className="payment-card-title">
        Cash on Delivery
        <span className="payment-popular">POPULAR</span>
      </span>
      <span className="payment-card-description">
        Pay cash when your order arrives
      </span>
    </span>

    <input
      className="payment-card-radio"
      type="radio"
      name="paymentMethod"
      value="cod"
      checked={paymentMethod === "cod"}
      onChange={() => setPaymentMethod("cod")}
    />
  </label>

  <label
    className={`payment-card ${paymentMethod === "online" ? "is-selected" : ""}`}
  >
    <span className="payment-card-icon upi-icon">
      <Ic n="grid" s={30} />
    </span>

    <span className="payment-card-content">
      <span className="payment-card-title">Online UPI Payment</span>
      <span className="payment-card-description">
        Pay using PhonePe, Google Pay or Paytm
      </span>
      <span className="payment-badges">
        <span>UPI ID</span>
        <span>QR CODE</span>
      </span>
    </span>

    <input
      className="payment-card-radio"
      type="radio"
      name="paymentMethod"
      value="online"
      checked={paymentMethod === "online"}
      onChange={() => setPaymentMethod("online")}
    />
  </label>

  {paymentMethod === "online" && (
    <div className="payment-online-note">
      <Ic n="shield" s={19} />
      <span>UPI payment selected. Payment availability depends on your configured payment setup.</span>
    </div>
  )}
</section>
<p className="hint">First order par free delivery. Baad mein weight ke hisaab se charge.</p>
<button className="btn" disabled={placing||!addr.trim()} onClick={place}>{placing?'Placing?':'Place Order'}</button></>}</aside></div>}
 {auth&&<Auth onClose={()=>{setAuth(false);setPendingServiceKind('')}} onDone={u=>{setUser(u);setAuth(false);setView(u?.role==='rider'?'rider':u?.role==='admin'?'admin':pendingServiceKind?'services':'shop');if(u?.role==='customer'&&pendingServiceKind)setServiceKind(pendingServiceKind);setPendingServiceKind('');toast('Welcome '+u.name)}}/>}
 {msg&&<div className="toast" role="status">{msg}</div>}
 </>;
 if(isMobile)return <><ShopEasyMertaNotice/><MobileApp {...{products,loading,q,onSearch,setQ,cart,add,lines,subtotal,count,user,view,setView,special,logout,setAuth,cartOpen,setCartOpen,dark,setDark,best,gi,overlays,openService}}/></>;

 return <><ShopEasyMertaNotice/><div className={dark?'app dark':'app'}>
 <header className="top"><div className="bar">
  <button className="brand" onClick={()=>go('All')}><img src="/shopeasy-logo.png" alt="ShopEasy Logo" style={{width:"55px",height:"55px",objectFit:"contain",flexShrink:0,transform:"translateY(6px)"}}/><span className="word">Shop<i>Easy</i></span></button>
  <button className="loc" onClick={()=>toast('Delivery: Merta Road, Rajasthan')}><span className="pin"><Ic n="pin" s={24}/></span><span><small>Deliver to</small><b>Your Location Merta Road</b></span></button>
  <input className="search" type="search" value={q} onChange={onSearch} placeholder="Search for products, brands and more..." aria-label="Search products" autoComplete="off"/>
  <nav>
   <button className="nav-item" onClick={()=>go('Festive & Gifts')}><span className="ni"><Ic n="crown"/></span><span className="nl">Offers</span></button>
   <button className="nav-item" onClick={()=>{const subject=encodeURIComponent("ShopEasy Support - Order/Payment Issue");const body=encodeURIComponent("Hello ShopEasy Support,\n\nIssue type: \nOrder ID: \nPayment amount: ?\nPayment date: \nTransaction ID (if available): \n\nPlease help me resolve this issue.\n\nThank you.");window.location.href="mailto:horizondigital155@gmail.com?subject="+subject+"&body="+body;}}><span className="ni"><Ic n="help"/></span><span className="nl">Help</span></button>
   {user?.role==='customer'?<><button className="nav-item" onClick={()=>setView('orders')}><span className="ni"><Ic n="box"/></span><span className="nl">My orders</span></button><button className="nav-item" onClick={()=>setView('services')}><span className="ni"><Ic n="gift"/></span><span className="nl">Train / Gas</span></button><button className="nav-item" onClick={logout}><span className="ni"><Ic n="logout"/></span><span className="nl">Logout</span></button></>
   :user?.role==='admin'?<><button className="nav-item" onClick={()=>setView('admin')}><span className="ni"><Ic n="gear"/></span><span className="nl">Admin</span></button><button className="nav-item" onClick={()=>setView('serviceAdmin')}><span className="ni"><Ic n="box"/></span><span className="nl">Services</span></button><button className="nav-item" onClick={logout}><span className="ni"><Ic n="logout"/></span><span className="nl">Logout</span></button></>
   :<button className="nav-item" onClick={()=>setAuth(true)}><span className="ni"><Ic n="user"/></span><span className="nl">Login</span></button>}
   <button className="nav-item mode" onClick={()=>setDark(!dark)} aria-label="Toggle dark mode"><span className="ni"><Ic n={dark?'sun':'moon'}/></span></button>
   <button className="cartbtn" onClick={()=>setCartOpen(true)}><span className="cart-ico"><Ic n="cart" s={26}/><em>{count}</em></span><span className="cart-txt"><small>Cart</small><b>{rupee(subtotal)}</b></span></button>
  </nav>
 </div></header>

 {user?.role==='admin'&&<p className="admin-note">Admin mode on - Products ab SQLite mein save honge.</p>}
 {special?<main className="plain">{special}</main>
 :<div className="shell">
  <aside className="side"><nav aria-label="All categories">
   <button className={'all'+(cat==='All'?' on':'')} onClick={()=>go('All')}><span><Ic n="menu" s={18}/></span><b>All Categories</b><i>-</i></button>
   {NAV.map(([n,s])=><button key={n} className={cat===n?'on':''} onClick={()=>go(n)}><span><Pic f={`cat-${s}`} k={s} x={gi(n)} s={12}/></span><b>{n}</b><i>-</i></button>)}
  </nav></aside>
  <main className="content">
    {cat === 'Fast Food' && <div className="fastfood-status" role="status">
      <style>{`
        .fastfood-status{display:flex;align-items:flex-start;gap:11px;padding:13px 16px;margin:0 0 18px;border:1px solid #b7e4c7;border-radius:12px;background:#effaf2;color:#174b2b;font-size:14px;line-height:1.5}
        .fastfood-status .ff-dot{width:11px;height:11px;min-width:11px;margin-top:4px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 0 rgba(22,163,74,.55);animation:ffPulse 1.4s infinite}
        .fastfood-status strong{display:block;margin-bottom:3px}
        @keyframes ffPulse{0%{box-shadow:0 0 0 0 rgba(22,163,74,.55);opacity:1}70%{box-shadow:0 0 0 8px rgba(22,163,74,0);opacity:.65}100%{box-shadow:0 0 0 0 rgba(22,163,74,0);opacity:1}}
        @media(prefers-reduced-motion:reduce){.fastfood-status .ff-dot{animation:none}}
      `}</style>
      <span className="ff-dot" aria-hidden="true"></span>
      <div><strong>Fast Food ? preparation status</strong>
      Fast food order prepare hone mein samay lag sakta hai. Delivery sirf item available hone aur order confirm hone ke baad hi possible hogi.</div>
    </div>}
    {shop}
  </main>
 </div>}

 <footer className="foot"><div className="foot-in">
  <div className="foot-brand"><div className="brand static"><img src="/shopeasy-logo.png" alt="ShopEasy Logo" style={{width:"47px",height:"47px",objectFit:"contain",flexShrink:0,transform:"translateY(6px)"}}/><span className="word">Shop<i>Easy</i></span></div><p>Fresh Products. Faster Delivery. Happier Homes.</p><div className="social"><span><Ic n="fb" s={12}/></span><span><Ic n="ig" s={12}/></span><span><Ic n="yt" s={12}/></span><span><Ic n="x" s={12}/></span><span><Ic n="in" s={12}/></span></div></div>
  <div><h4>Customer Service</h4><a>Help Center</a><a>Track Order</a><a>Returns &amp; Refunds</a><a href="mailto:horizondigital155@gmail.com?subject=ShopEasy%20Customer%20Support">Contact Us</a><a>FAQ</a></div>
  <div><h4>About Us</h4><a>Our Story</a><a>Careers</a><a>Terms &amp; Conditions</a><a>Privacy Policy</a><a>Sitemap</a></div>
  <div><h4>Payment Methods</h4><div className="pay"><span className="visa">VISA</span><span className="mc"><i/><i/></span><span className="rupay">RuPay</span><span className="upi">UPI</span></div><p className="secure"><Ic n="shield" s={14}/> 100% Secure Payments</p></div>
  <div><h4>Subscribe to our Newsletter</h4><p>Get latest offers and updates</p><form className="news" onSubmit={e=>{e.preventDefault();toast('Subscribe ho gaya');e.currentTarget.reset()}}><input type="email" placeholder="Enter your email" required aria-label="Email"/><button>Subscribe</button></form></div>
 </div></footer>

 {overlays}
</div>;</>
}
