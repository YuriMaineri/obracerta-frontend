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
