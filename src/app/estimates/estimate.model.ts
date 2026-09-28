import { Page } from '../customers/customer.model';

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
}

export interface MaterialLine {
  description: string;
  quantity: number | null;
  totalPrice: number | null;
}

export interface PriceLine {
  description: string;
  amount: number;
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
