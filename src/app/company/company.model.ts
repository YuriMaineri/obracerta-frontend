import { formatCnpj, formatCpf, onlyDigits } from '../shared/br-formats';

export interface Company {
  id: number;
  legalName: string;
  tradeName: string | null;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
  postalCode: string | null;
  signatoryName: string | null;
  hasLogo: boolean;
}

export type CompanyRequest = Omit<Company, 'id' | 'hasLogo'>;

export interface BankAccount {
  id: number;
  bank: string;
  branch: string | null;
  accountNumber: string | null;
  accountType: string | null;
  pixKey: string | null;
  holder: string | null;
  defaultAccount: boolean;
}

export type BankAccountRequest = Omit<BankAccount, 'id'>;

export type ClauseType = 'PAYMENT' | 'WARRANTY' | 'OBSERVATION' | 'REGULATORY';

export interface Clause {
  id: number;
  type: ClauseType;
  title: string;
  content: string;
  defaultClause: boolean;
  sortOrder: number;
}

export type ClauseRequest = Omit<Clause, 'id'>;

/** Mesma ordem das seções na proposta. */
export const CLAUSE_SECTIONS: { type: ClauseType; label: string }[] = [
  { type: 'PAYMENT', label: 'Forma de pagamento' },
  { type: 'WARRANTY', label: 'Garantia' },
  { type: 'OBSERVATION', label: 'Observações' },
  { type: 'REGULATORY', label: 'Normas regulamentadoras' },
];

export function groupClauses(clauses: Clause[]): { type: ClauseType; label: string; items: Clause[] }[] {
  return CLAUSE_SECTIONS.map((section) => ({
    ...section,
    items: clauses
      .filter((c) => c.type === section.type)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
  }));
}

/** Chave PIX legível: CNPJ e CPF saem formatados e com o tipo na frente. */
export function formatPixKey(pixKey: string | null): string | null {
  if (!pixKey) return null;
  const digits = onlyDigits(pixKey);
  if (digits.length === pixKey.replace(/[\s./-]/g, '').length) {
    if (digits.length === 14) return `CNPJ ${formatCnpj(digits)}`;
    if (digits.length === 11) return `CPF ${formatCpf(digits)}`;
  }
  return pixKey;
}

/** Linha de pagamento como sai na proposta. */
export function proposalLine(account: BankAccount): string {
  const accountLabel = /corrente/i.test(account.accountType ?? '') ? 'C/C' : 'Conta';
  const pix = formatPixKey(account.pixKey);
  return [
    account.bank,
    account.branch && `Ag. ${account.branch}`,
    account.accountNumber && `${accountLabel} ${account.accountNumber}`,
    pix && `PIX ${pix}`,
    account.holder && `Titular: ${account.holder}`,
  ]
    .filter(Boolean)
    .join(' · ');
}
