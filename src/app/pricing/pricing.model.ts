import { CompositionLine, SOLD_WHOLE, Unit } from '../catalog/catalog.model';
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

/** Insumo de um serviço do orçamento: quantity é o consumo já com a perda; cost nulo = insumo sem preço. */
export interface MaterialUse {
  materialId: number;
  material: string;
  unit: Unit;
  packageName: string | null;
  packageSize: number | null;
  quantityPerUnit: number;
  wastePercent: number;
  quantity: number;
  unitPrice: number | null;
  cost: number | null;
}

/** Um insumo somado em todos os serviços: cost entra no preço; purchaseCost é o que se paga em embalagens inteiras. */
export interface ShoppingItem {
  materialId: number;
  material: string;
  unit: Unit;
  packageName: string | null;
  packageSize: number | null;
  needed: number;
  packages: number | null;
  bought: number;
  leftover: number;
  unitPrice: number | null;
  cost: number | null;
  purchaseCost: number | null;
}

/** Mesma conta do PriceCalculator.material: consumo × (1 + perda) × quantidade; custo pelo custo por unidade. */
export function materialUse(quantity: number, line: CompositionLine): MaterialUse {
  return {
    materialId: line.materialId,
    material: line.materialName,
    unit: line.materialUnit,
    packageName: line.packageName,
    packageSize: line.packageSize,
    quantityPerUnit: line.quantityPerUnit,
    wastePercent: line.wastePercent,
    quantity: round(quantity * line.quantityPerUnit * (1 + line.wastePercent / 100), 4),
    unitPrice: line.materialPrice,
    cost: line.costPerUnit == null ? null : cents(quantity * line.costPerUnit),
  };
}

/** Mesma regra do Purchase do backend: embalagem inteira, ou unidade inteira para saco, peça, rolo... */
export function purchase(unit: Unit, packageSize: number | null, needed: number, price: number | null) {
  let packages: number | null = null;
  let bought = needed;
  if (packageSize) {
    packages = Math.ceil(round(needed / packageSize, 6));
    bought = round(packages * packageSize, 4);
  } else if (SOLD_WHOLE.includes(unit)) {
    packages = Math.ceil(round(needed, 6));
    bought = packages;
  }
  return { packages, bought, leftover: round(bought - needed, 4), cost: price == null ? null : cents(bought * price) };
}

/** Soma o mesmo insumo em todos os serviços, na ordem em que aparece, e arredonda para a compra. */
export function shoppingList(uses: MaterialUse[]): ShoppingItem[] {
  const byMaterial = new Map<number, MaterialUse[]>();
  for (const u of uses) byMaterial.set(u.materialId, [...(byMaterial.get(u.materialId) ?? []), u]);
  return [...byMaterial.values()].map((list) => {
    const first = list[0];
    const needed = round(list.reduce((sum, u) => sum + u.quantity, 0), 4);
    const cost = list.some((u) => u.cost == null) ? null : cents(list.reduce((sum, u) => sum + u.cost!, 0));
    const p = purchase(first.unit, first.packageSize, needed, first.unitPrice);
    return {
      materialId: first.materialId,
      material: first.material,
      unit: first.unit,
      packageName: first.packageName,
      packageSize: first.packageSize,
      needed,
      packages: p.packages,
      bought: p.bought,
      leftover: p.leftover,
      unitPrice: first.unitPrice,
      cost,
      purchaseCost: p.cost,
    };
  });
}
