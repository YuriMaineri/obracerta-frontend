import { MaterialSupply } from '../estimates/estimate.model';

export type Difficulty = 'EASY' | 'NORMAL' | 'HARD' | 'VERY_HARD';

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'EASY', label: 'Fácil' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HARD', label: 'Difícil' },
  { value: 'VERY_HARD', label: 'Muito difícil' },
];

export interface PricingSettings {
  dailyRate: number;
  indirectPercent: number;
  marginPercent: number;
  easyFactor: number;
  normalFactor: number;
  hardFactor: number;
  veryHardFactor: number;
  updatedAt?: string;
}

export interface ItemQuote {
  laborDays: number;
  laborCost: number;
  materialCost: number;
  price: number;
}

export interface Quote {
  laborDays: number;
  laborCost: number;
  materialCost: number;
  materialCharged: boolean;
  indirectCost: number;
  margin: number;
  total: number;
}

/** Arredonda como o HALF_UP do backend, sem cair no erro binário (37,485 × 100 = 3748,4999…). */
const round = (value: number, places: number) => Math.round(Number((value * 10 ** places).toFixed(6))) / 10 ** places;
const cents = (value: number) => round(value, 2);

export function factorFor(settings: PricingSettings, difficulty: Difficulty | null): number {
  switch (difficulty ?? 'NORMAL') {
    case 'EASY':
      return settings.easyFactor;
    case 'HARD':
      return settings.hardFactor;
    case 'VERY_HARD':
      return settings.veryHardFactor;
    default:
      return settings.normalFactor;
  }
}

/** Material do cliente ou comprado por nota não entra no preço. */
export function chargesMaterial(supply: MaterialSupply): boolean {
  return supply === 'ITEMIZED' || supply === 'ESTIMATED';
}

/** Mesma conta do PriceCalculator do backend. */
export function itemQuote(
  settings: PricingSettings,
  quantity: number,
  daysPerUnit: number | null,
  materialCostPerUnit: number | null,
  difficulty: Difficulty | null,
  chargeMaterial: boolean,
): ItemQuote {
  const days = quantity * (daysPerUnit ?? 0) * factorFor(settings, difficulty);
  const laborCost = cents(days * settings.dailyRate);
  const materialCost = cents(quantity * (materialCostPerUnit ?? 0));
  const base = chargeMaterial ? laborCost + materialCost : laborCost;
  const price = cents(base * (1 + settings.indirectPercent / 100) * (1 + settings.marginPercent / 100));
  return { laborDays: round(days, 3), laborCost, materialCost, price };
}

export function totalQuote(settings: PricingSettings, items: ItemQuote[], chargeMaterial: boolean): Quote {
  const sum = (pick: (q: ItemQuote) => number) => items.reduce((acc, q) => acc + pick(q), 0);
  const laborDays = round(sum((q) => q.laborDays), 3);
  const laborCost = cents(sum((q) => q.laborCost));
  const materialCost = cents(sum((q) => q.materialCost));
  const direct = chargeMaterial ? cents(laborCost + materialCost) : laborCost;
  const indirectCost = cents((direct * settings.indirectPercent) / 100);
  const margin = cents(((direct + indirectCost) * settings.marginPercent) / 100);
  return { laborDays, laborCost, materialCost, materialCharged: chargeMaterial, indirectCost, margin, total: cents(direct + indirectCost + margin) };
}

/** "+12%" quando o praticado está acima do sugerido. */
export function difference(practiced: number, suggested: number): string | null {
  if (!suggested) return null;
  const pct = Math.round(((practiced - suggested) / suggested) * 100);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}
