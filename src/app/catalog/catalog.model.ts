export type Unit =
  | 'SQUARE_METER'
  | 'METER'
  | 'CUBIC_METER'
  | 'PIECE'
  | 'POINT'
  | 'HOUR'
  | 'DAY'
  | 'LUMP_SUM'
  | 'KILOGRAM'
  | 'LITER'
  | 'BAG'
  | 'CAN'
  | 'ROLL'
  | 'BAR'
  | 'BOX'
  | 'PACKAGE';

export type ServiceCategory =
  | 'ELECTRICAL'
  | 'PAINTING'
  | 'MASONRY'
  | 'FLOORING'
  | 'DRYWALL'
  | 'PLUMBING'
  | 'WATERPROOFING'
  | 'DEMOLITION'
  | 'OTHER';

export type PricingMode = 'BY_MEASUREMENT' | 'PER_PIECE' | 'LUMP_SUM';

export const UNIT_SYMBOLS: Record<Unit, string> = {
  SQUARE_METER: 'm²',
  METER: 'm',
  CUBIC_METER: 'm³',
  PIECE: 'un',
  POINT: 'ponto',
  HOUR: 'h',
  DAY: 'diária',
  LUMP_SUM: 'verba',
  KILOGRAM: 'kg',
  LITER: 'L',
  BAG: 'saco',
  CAN: 'lata',
  ROLL: 'rolo',
  BAR: 'barra',
  BOX: 'caixa',
  PACKAGE: 'pacote',
};

export const MATERIAL_UNITS: Unit[] = [
  'PIECE', 'METER', 'SQUARE_METER', 'CUBIC_METER', 'KILOGRAM', 'LITER', 'BAG', 'CAN', 'ROLL', 'BAR', 'BOX', 'PACKAGE',
];

export const SERVICE_UNITS: Unit[] = ['SQUARE_METER', 'METER', 'CUBIC_METER', 'PIECE', 'POINT', 'LUMP_SUM'];

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  ELECTRICAL: 'Elétrica',
  PAINTING: 'Pintura',
  MASONRY: 'Alvenaria e reboco',
  FLOORING: 'Pisos e revestimentos',
  DRYWALL: 'Gesso e drywall',
  PLUMBING: 'Hidráulica',
  WATERPROOFING: 'Impermeabilização',
  DEMOLITION: 'Demolição e limpeza',
  OTHER: 'Outros',
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as ServiceCategory[];

export const PRICING_MODE_LABELS: Record<PricingMode, string> = {
  BY_MEASUREMENT: 'Por medida',
  PER_PIECE: 'Por peça ou ponto',
  LUMP_SUM: 'Verba fechada',
};

export interface Material {
  id: number;
  name: string;
  unit: Unit;
  price: number | null;
  supplier: string | null;
  updatedOn: string | null;
  usedBy: string[];
}

export interface MaterialRequest {
  name: string;
  unit: Unit;
  price: number | null;
  supplier: string | null;
}

export interface MaterialPrice {
  price: number;
  effectiveDate: string;
}

export interface CompositionLine {
  materialId: number;
  materialName: string;
  materialUnit: Unit;
  materialPrice: number | null;
  quantityPerUnit: number;
  wastePercent: number;
  costPerUnit: number | null;
}

export interface ServiceItem {
  id: number;
  name: string;
  category: ServiceCategory | null;
  unit: Unit;
  pricingMode: PricingMode;
  proposalDescription: string | null;
  daysPerUnit: number | null;
  usualPrice: number | null;
  composition: CompositionLine[];
  materialCostPerUnit: number;
  missingPrices: boolean;
}

export interface ServiceRequest {
  name: string;
  category: ServiceCategory;
  unit: Unit;
  proposalDescription: string | null;
  daysPerUnit: number | null;
  usualPrice: number | null;
  composition: { materialId: number; quantityPerUnit: number; wastePercent: number | null }[];
}

/** Mesma conta do backend: consumo × (1 + perda) × preço, arredondado em centavos. Nulo sem preço. */
export function lineCost(quantityPerUnit: number, wastePercent: number | null, price: number | null): number | null {
  if (price == null) return null;
  return Math.round(quantityPerUnit * (1 + (wastePercent ?? 0) / 100) * price * 100) / 100;
}

/** "Rende 28 m² por dia" vira 0,0357 diária por m²; o banco guarda diárias por unidade. */
export function yieldToDays(perDay: number | null): number | null {
  if (perDay == null || perDay <= 0) return null;
  return Math.round((1 / perDay) * 10000) / 10000;
}

export function daysToYield(days: number | null): number | null {
  if (days == null || days <= 0) return null;
  return Math.round((1 / days) * 10) / 10;
}

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 });

export function formatQuantity(value: number | null | undefined): string {
  return value == null ? '—' : decimal.format(value);
}

/** "28 m² por dia", ou "2 dias" quando é verba. */
export function productivityLabel(s: Pick<ServiceItem, 'unit' | 'daysPerUnit'>): string {
  if (s.daysPerUnit == null) return 'Não informado';
  if (s.unit === 'LUMP_SUM') {
    const d = s.daysPerUnit;
    return `${formatQuantity(d)} ${d === 1 ? 'diária' : 'diárias'} no total`;
  }
  const perDay = daysToYield(s.daysPerUnit);
  const symbol = s.unit === 'POINT' && perDay !== 1 ? 'pontos' : UNIT_SYMBOLS[s.unit];
  return `${formatQuantity(perDay)} ${symbol} por dia`;
}
