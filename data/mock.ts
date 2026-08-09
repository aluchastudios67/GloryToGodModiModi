/**
 * All demo data lives here. Nothing in the app talks to a network except the
 * photo CDN — swap PHOTOS for `require('../assets/...')` to go fully offline.
 */

const unsplash = (id: string, w = 400) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop&crop=faces`;

/** Every image URL in the app. One place to swap remote photos for local assets. */
export const PHOTOS = {
  // walkers
  nino: unsplash('photo-1494790108377-be9c29b29330', 240),
  giorgi: unsplash('photo-1507003211169-0a1dd7228f2d', 240),
  ana: unsplash('photo-1438761681033-6461ffad8d80', 240),
  davit: unsplash('photo-1500648767791-00dcc994a43e', 240),
  mariam: unsplash('photo-1544005313-94ddf0286df2', 240),
  // the person using the app (owner and walker mode share one identity)
  me: unsplash('photo-1552058544-f2b08422138a', 240),
  // dogs
  bobi: unsplash('photo-1518717758536-85ae29035b6d', 400),
  rei: unsplash('photo-1615751072497-5f5169febe17', 400),
  luna: unsplash('photo-1596492784531-6e6eb5ea9993', 400),
  charli: unsplash('photo-1591160690555-5debfba289f0', 400),
  topi: unsplash('photo-1593134257782-e89567b7718a', 400),
  haski: unsplash('photo-1605568427561-40dd23c2acea', 400),
  // walk photo report
  report1: unsplash('photo-1576201836106-db1758fd1c97', 500),
  report2: unsplash('photo-1530281700549-e82e7bf110d6', 500),
  report3: unsplash('photo-1548199973-03cce0bbc87b', 500),
} as const;

/* ------------------------------------------------------------------ types */

/** When a walker is free, or when a dog needs walking. */
export type Availability =
  | { kind: 'now' }
  /** `label` is already localised, e.g. `19:00-დან` or `ხვალ, 09:00`. */
  | { kind: 'later'; label: string };

export type Walker = {
  id: string;
  name: string;
  photo: string;
  /** 0–5, one decimal. */
  rating: number;
  reviews: number;
  distanceKm: number;
  /** Price for a 30 minute walk, in lari, no decimals. */
  price30: number;
  verified: boolean;
  availability: Availability;
  district: string;
  bio: string;
};

export type Dog = {
  id: string;
  name: string;
  photo: string;
  breed: string;
  /** Already localised, e.g. `3 წლის`. */
  age: string;
  /** Short form for meta rows, e.g. `2 წ.`. */
  ageShort: string;
};

export type DogRequest = {
  id: string;
  dog: Dog;
  distanceKm: number;
  when: Availability;
  /** What the walker earns, in lari. */
  payout: number;
  owner: string;
  address: string;
};

export type BookingStatus = 'upcoming' | 'active' | 'done';

export type Booking = {
  id: string;
  dog: Dog;
  walkerId: string;
  walkerName: string;
  walkerPhoto: string;
  /** Already localised, e.g. `დღეს, 18:00`. */
  when: string;
  durationMin: number;
  total: number;
  status: BookingStatus;
  address: string;
};

export type Message = {
  id: string;
  /** `me` renders as a teal bubble on the right. */
  from: 'me' | 'them';
  text: string;
  time: string;
};

export type Conversation = {
  id: string;
  name: string;
  photo: string;
  last: string;
  time: string;
  unread: number;
  messages: Message[];
};

/* ------------------------------------------------------------------- data */

export const DISTRICTS = ['ვაკე', 'საბურთალო', 'ვერა', 'მთაწმინდა'] as const;

/** Where the owner is standing — shown in the header pill. */
export const currentLocation = 'ვაკე, თბილისი';

export const walkers: Walker[] = [
  {
    id: 'w1',
    name: 'ნინო ბ.',
    photo: PHOTOS.nino,
    rating: 4.9,
    reviews: 127,
    distanceKm: 0.8,
    price30: 15,
    verified: true,
    availability: { kind: 'now' },
    district: 'ვაკე',
    bio: 'სამი წელია ვასეირნებ ძაღლებს ვაკეში. მიყვარს გრძელი გასეირნებები ვაკის პარკში.',
  },
  {
    id: 'w2',
    name: 'გიორგი მ.',
    photo: PHOTOS.giorgi,
    rating: 4.8,
    reviews: 94,
    distanceKm: 1.2,
    price30: 18,
    verified: true,
    availability: { kind: 'now' },
    district: 'საბურთალო',
    bio: 'ვეტერინარიის სტუდენტი. დიდ ჯიშებთან მუშაობის გამოცდილება მაქვს.',
  },
  {
    id: 'w3',
    name: 'ანა კ.',
    photo: PHOTOS.ana,
    rating: 5.0,
    reviews: 41,
    distanceKm: 1.6,
    price30: 14,
    verified: true,
    availability: { kind: 'later', label: '19:00-დან' },
    district: 'ვერა',
    bio: 'საღამოობით თავისუფალი ვარ. ყოველი სეირნობის შემდეგ ფოტოებს გიგზავნით.',
  },
  {
    id: 'w4',
    name: 'დავით ს.',
    photo: PHOTOS.davit,
    rating: 4.7,
    reviews: 63,
    distanceKm: 2.1,
    price30: 16,
    verified: false,
    availability: { kind: 'now' },
    district: 'მთაწმინდა',
    bio: 'ვცხოვრობ მთაწმინდაზე, ყოველდღე დილით და საღამოს ვასეირნებ.',
  },
  {
    id: 'w5',
    name: 'მარიამ თ.',
    photo: PHOTOS.mariam,
    rating: 5.0,
    reviews: 38,
    distanceKm: 2.4,
    price30: 20,
    verified: true,
    availability: { kind: 'now' },
    district: 'საბურთალო',
    bio: 'კინოლოგი ვარ. ვმუშაობ მორცხვ და შფოთიან ძაღლებთან.',
  },
];

/* ---------------------------------------------------------------- my dogs */

export const myDogs: Dog[] = [
  {
    id: 'd1',
    name: 'ბობი',
    photo: PHOTOS.bobi,
    breed: 'ლაბრადორი',
    age: '3 წლის',
    ageShort: '3 წ.',
  },
];

const rei: Dog = {
  id: 'd2',
  name: 'რეი',
  photo: PHOTOS.rei,
  breed: 'შიბა ინუ',
  age: '2 წლის',
  ageShort: '2 წ.',
};
const luna: Dog = {
  id: 'd3',
  name: 'ლუნა',
  photo: PHOTOS.luna,
  breed: 'პუდელის მიქსი',
  age: '4 წლის',
  ageShort: '4 წ.',
};
const charli: Dog = {
  id: 'd4',
  name: 'ჩარლი',
  photo: PHOTOS.charli,
  breed: 'გოლდენ რეტრივერი',
  age: '5 წლის',
  ageShort: '5 წ.',
};
const topi: Dog = {
  id: 'd5',
  name: 'თოფი',
  photo: PHOTOS.topi,
  breed: 'ჯეკ რასელი',
  age: '1 წლის',
  ageShort: '1 წ.',
};
const haski: Dog = {
  id: 'd6',
  name: 'ჯეკი',
  photo: PHOTOS.haski,
  breed: 'ჰასკი',
  age: '3 წლის',
  ageShort: '3 წ.',
};

export const allDogs: Dog[] = [...myDogs, rei, luna, charli, topi, haski];

/* --------------------------------------------------------- walker inbound */

export const dogRequests: DogRequest[] = [
  {
    id: 'r1',
    dog: rei,
    distanceKm: 0.6,
    when: { kind: 'now' },
    payout: 15,
    owner: 'ნატა ჯ.',
    address: 'ვაკე, ჭავჭავაძის 37',
  },
  {
    id: 'r2',
    dog: luna,
    distanceKm: 1.1,
    when: { kind: 'now' },
    payout: 18,
    owner: 'ლევან კ.',
    address: 'ვერა, კიაჩელის 7',
  },
  {
    id: 'r3',
    dog: charli,
    distanceKm: 1.4,
    when: { kind: 'later', label: 'დღეს, 19:00' },
    payout: 20,
    owner: 'სოფო რ.',
    address: 'საბურთალო, ყაზბეგის 24',
  },
  {
    id: 'r4',
    dog: topi,
    distanceKm: 2.0,
    when: { kind: 'later', label: 'ხვალ, 09:00' },
    payout: 14,
    owner: 'ირაკლი ბ.',
    address: 'მთაწმინდა, ბესიკის 5',
  },
];

/* -------------------------------------------------------------- bookings */

export const bookings: Booking[] = [
  {
    id: 'b1',
    dog: myDogs[0],
    walkerId: 'w1',
    walkerName: 'ნინო ბ.',
    walkerPhoto: PHOTOS.nino,
    when: 'ხვალ, 09:30',
    durationMin: 45,
    total: 25,
    status: 'upcoming',
    address: 'ვაკე, აბაშიძის 12',
  },
  {
    id: 'b2',
    dog: myDogs[0],
    walkerId: 'w2',
    walkerName: 'გიორგი მ.',
    walkerPhoto: PHOTOS.giorgi,
    when: '4 აგვისტო, 18:00',
    durationMin: 30,
    total: 21,
    status: 'done',
    address: 'ვაკე, აბაშიძის 12',
  },
  {
    id: 'b3',
    dog: myDogs[0],
    walkerId: 'w5',
    walkerName: 'მარიამ თ.',
    walkerPhoto: PHOTOS.mariam,
    when: '1 აგვისტო, 19:00',
    durationMin: 60,
    total: 43,
    status: 'done',
    address: 'ვაკე, აბაშიძის 12',
  },
];

/* ----------------------------------------------------------------- chats */

export const conversations: Conversation[] = [
  {
    id: 'c1',
    name: 'ნინო ბ.',
    photo: PHOTOS.nino,
    last: 'ბობი მშვენივრად იყო, ფოტოებს გიგზავნი 🐾',
    time: '14:32',
    unread: 2,
    messages: [
      { id: 'm1', from: 'them', text: 'გამარჯობა! ბობისთვის მოვდივარ 18:00-ზე.', time: '14:20' },
      { id: 'm2', from: 'me', text: 'გამარჯობა ნინო, მადლობა! სადარბაზოს კოდია 12-45.', time: '14:22' },
      { id: 'm3', from: 'them', text: 'მივიღე. თოკი თან წამოვიღო თუ თქვენთანაა?', time: '14:25' },
      { id: 'm4', from: 'me', text: 'ჩვენთანაა, კარებთან დაგხვდებათ.', time: '14:26' },
      { id: 'm5', from: 'them', text: 'ბობი მშვენივრად იყო, ფოტოებს გიგზავნი 🐾', time: '14:32' },
    ],
  },
  {
    id: 'c2',
    name: 'გიორგი მ.',
    photo: PHOTOS.giorgi,
    last: 'დიდი მადლობა შეფასებისთვის!',
    time: 'გუშინ',
    unread: 0,
    messages: [
      { id: 'm1', from: 'them', text: 'სეირნობა დასრულდა, ბობი სახლშია.', time: '18:34' },
      { id: 'm2', from: 'me', text: 'მადლობა გიორგი, ხუთი ვარსკვლავი ✨', time: '18:40' },
      { id: 'm3', from: 'them', text: 'დიდი მადლობა შეფასებისთვის!', time: '18:41' },
    ],
  },
  {
    id: 'c3',
    name: 'მარიამ თ.',
    photo: PHOTOS.mariam,
    last: 'ხვალ დილით თავისუფალი ვარ.',
    time: '1 აგვ.',
    unread: 0,
    messages: [
      { id: 'm1', from: 'me', text: 'გამარჯობა, კვირას თავისუფალი ხართ?', time: '11:02' },
      { id: 'm2', from: 'them', text: 'ხვალ დილით თავისუფალი ვარ.', time: '11:15' },
    ],
  },
];

/* --------------------------------------------------------------- helpers */

/** `15` → `₾15`. Prices never carry decimals. */
export const gel = (amount: number) => `₾${Math.round(amount)}`;

/** `0.8` → `0.8 კმ`. */
export const km = (value: number) => `${value.toFixed(1)} კმ`;

/** Duration options on the booking screen. */
export const DURATIONS = [30, 45, 60] as const;
export type Duration = (typeof DURATIONS)[number];

/** A 45 min walk costs 1.5×, a 60 min walk 2× the 30 min price. */
export const priceFor = (price30: number, minutes: number) =>
  Math.round((price30 * minutes) / 30);

/** Flat platform fee, same on every booking. */
export const SERVICE_FEE = 3;

export const findWalker = (id?: string | string[]) =>
  walkers.find((w) => w.id === (Array.isArray(id) ? id[0] : id));
