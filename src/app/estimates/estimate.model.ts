import { UNIT_SYMBOLS, formatQuantity, unitLabel } from '../catalog/catalog.model';
import { Page } from '../customers/customer.model';
import { type Difficulty, type PricingSettings, type ShoppingItem, withMarkup } from '../pricing/pricing.model';

export type EstimateStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
export type MaterialSupply = 'ITEMIZED' | 'ESTIMATED' | 'BY_RECEIPT' | 'CUSTOMER_SUPPLIED';

export const STATUS_LABELS: Record<EstimateStatus, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
};

export const MATERIAL_SUPPLY_OPTIONS: { value: MaterialSupply; label: string; hint: string }[] = [
  { value: 'ITEMIZED', label: 'Detalhado', hint: 'Material listado item a item, com preço.' },
  { value: 'ESTIMATED', label: 'Estimado', hint: 'Valor aproximado agora; lista detalhada depois da aprovação.' },
  { value: 'BY_RECEIPT', label: 'Por nota', hint: 'A empresa compra e apresenta as notas durante a obra.' },
  { value: 'CUSTOMER_SUPPLIED', label: 'Do cliente', hint: 'Material por conta do cliente; não entra no valor.' },
];

export interface EstimateSummary {
  id: number;
  number: string;
  status: EstimateStatus;
  customerId: number;
  customerName: string | null;
  title: string | null;
  issueDate: string;
  mainAmount: number | null;
  priceLineCount: number;
  minLeadDays: number | null;
  maxLeadDays: number | null;
  updatedAt: string;
}

export interface ServiceLine {
  description: string;
  internalNote: string | null;
  serviceId?: number | null;
  quantity?: number | null;
  difficulty?: Difficulty | null;
  suggestedPrice?: number | null;
}

/** materialId preenchido = linha trazida da lista de compra dos serviços; nulo = digitada à mão. */
export interface MaterialLine {
  description: string;
  quantity: number | null;
  totalPrice: number | null;
  materialId?: number | null;
}

export interface PriceLine {
  description: string;
  amount: number;
  alternative: boolean;
}

export interface EstimateDetails {
  id: number;
  number: string;
  status: EstimateStatus;
  customer: {
    id: number;
    name: string;
    personType: string;
    taxId: string | null;
    contactPerson: string | null;
    address: string | null;
    district: string | null;
    city: string | null;
  };
  title: string | null;
  issueDate: string;
  validityDays: number | null;
  minLeadDays: number | null;
  maxLeadDays: number | null;
  materialSupply: MaterialSupply;
  estimatedMaterialCost: number | null;
  paymentTerms: string | null;
  bankAccountId: number | null;
  clauseIds: number[];
  services: ServiceLine[];
  materials: MaterialLine[];
  priceLines: PriceLine[];
  exclusions: string[];
  internalNotes: string[];
  suggestedTotal: number | null;
  suggestedDays: number | null;
  updatedAt: string;
}

export interface EstimateRequest {
  customerId: number;
  title: string | null;
  issueDate: string | null;
  validityDays: number | null;
  minLeadDays: number | null;
  maxLeadDays: number | null;
  materialSupply: MaterialSupply;
  estimatedMaterialCost: number | null;
  paymentTerms: string | null;
  bankAccountId: number | null;
  clauseIds: number[] | null;
  services: ServiceLine[];
  materials: MaterialLine[];
  priceLines: PriceLine[];
  exclusions: string[];
  internalNotes: string[];
}

export type EstimatePage = Page<EstimateSummary>;

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatMoney(value: number | null | undefined): string {
  return value == null ? '—' : currency.format(value);
}

/** "2026-09-28" -> "28/09/2026", sem passar por Date para não sofrer com fuso. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Como o prazo sai no documento: "4 a 5 dias úteis", "1 dia útil". */
export function formatLeadTime(min: number | null, max: number | null): string {
  const plural = (n: number) => (n === 1 ? 'dia útil' : 'dias úteis');
  if (min != null && max != null && min !== max) return `${min} a ${max} ${plural(max)}`;
  const value = max ?? min;
  return value == null ? 'Não informado' : `${value} ${plural(value)}`;
}

export function sumMaterials(lines: MaterialLine[]): number {
  return lines.reduce((total, line) => total + (line.totalPrice ?? 0), 0);
}

/**
 * Lista de compra dos serviços como linhas de "Material a ser usado": a quantidade é a da compra (embalagens
 * fechadas) e o preço é o da compra com custo indireto e margem. Sem preço quando withPrice é falso.
 */
export function materialLinesFrom(shopping: ShoppingItem[], settings: PricingSettings, withPrice: boolean): MaterialLine[] {
  return shopping.map((s) => {
    const quantity = s.packages ?? Math.ceil(Number((s.bought * 100).toFixed(6))) / 100;
    const amount = s.packageName && s.packageSize
      ? `${formatQuantity(quantity)} ${quantity === 1 ? s.packageName : plural(s.packageName)} de ${formatQuantity(s.packageSize)} ${UNIT_SYMBOLS[s.unit]}`
      : `${formatQuantity(quantity)} ${unitLabel(s.unit, quantity)}`;
    return {
      description: `${s.material} — ${amount}`,
      quantity,
      totalPrice: withPrice && s.purchaseCost != null ? withMarkup(settings, s.purchaseCost) : null,
      materialId: s.materialId,
    };
  });
}

/** Plural da primeira palavra da embalagem: galão → galões, balde → baldes, barril → barris. */
function plural(name: string): string {
  const [first, ...rest] = name.split(' ');
  let word = first;
  if (/ão$/.test(word)) word = word.replace(/ão$/, 'ões');
  else if (/[aeiou]$/i.test(word)) word += 's';
  else if (/[rzs]$/i.test(word)) word += 'es';
  else if (/l$/i.test(word)) word = word.replace(/l$/i, 'is');
  return [word, ...rest].join(' ');
}
