const KEY = 'glacify:v1';

export const DEFAULT_FLAVORS = [
  { id: 'vanille', name: 'Vanille', color: '#F3E5AB' },
  { id: 'chocolat', name: 'Chocolat', color: '#7B4A2E' },
  { id: 'fraise', name: 'Fraise', color: '#F4A6B8' },
  { id: 'pistache', name: 'Pistache', color: '#B5D99C' },
  { id: 'caramel', name: 'Caramel beurre salé', color: '#D9A066' },
  { id: 'citron', name: 'Citron', color: '#F7E37A' },
  { id: 'menthe', name: 'Menthe chocolat', color: '#A8E6CF' },
  { id: 'mangue', name: 'Mangue', color: '#FFB84D' },
  { id: 'framboise', name: 'Framboise', color: '#E25C7A' },
  { id: 'cafe', name: 'Café', color: '#A47551' },
  { id: 'coco', name: 'Noix de coco', color: '#F4F1EA' },
  { id: 'stracciatella', name: 'Stracciatella', color: '#E9E1D3' },
].map((f) => ({ ...f, available: true }));

export const DEFAULT_TOPPINGS = [
  { id: 'chantilly', name: 'Chantilly' },
  { id: 'coulis-choco', name: 'Coulis chocolat' },
  { id: 'coulis-fruits', name: 'Coulis fruits rouges' },
  { id: 'amandes', name: 'Amandes grillées' },
  { id: 'vermicelles', name: 'Vermicelles' },
  { id: 'gaufrette', name: 'Gaufrette' },
];

export function defaultState() {
  return {
    flavors: DEFAULT_FLAVORS.map((f) => ({ ...f })),
    toppings: DEFAULT_TOPPINGS.map((t) => ({ ...t })),
    orders: [],
    checks: {},
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    // Corrupted or unavailable storage: start fresh.
  }
  return defaultState();
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota: the app keeps working in memory.
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10);
