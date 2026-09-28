import { BankAccount, Clause, formatPixKey, groupClauses, proposalLine } from './company.model';

const clause = (id: number, type: Clause['type'], sortOrder: number, title = `c${id}`): Clause => ({
  id,
  type,
  title,
  content: '',
  defaultClause: false,
  sortOrder,
});

describe('groupClauses', () => {
  it('returns sections in proposal order, even when empty', () => {
    const groups = groupClauses([clause(1, 'REGULATORY', 1)]);
    expect(groups.map((g) => g.type)).toEqual(['PAYMENT', 'WARRANTY', 'OBSERVATION', 'REGULATORY']);
    expect(groups[0].items).toEqual([]);
  });

  it('sorts items by sortOrder then title', () => {
    const groups = groupClauses([
      clause(1, 'PAYMENT', 2, 'b'),
      clause(2, 'PAYMENT', 1, 'z'),
      clause(3, 'PAYMENT', 2, 'a'),
    ]);
    expect(groups[0].items.map((c) => c.id)).toEqual([2, 3, 1]);
  });
});

describe('formatPixKey', () => {
  it('labels CNPJ and CPF keys and keeps others as typed', () => {
    expect(formatPixKey('24839705000165')).toBe('CNPJ 24.839.705/0001-65');
    expect(formatPixKey('529.982.247-25')).toBe('CPF 529.982.247-25');
    expect(formatPixKey('contato@maineri.com.br')).toBe('contato@maineri.com.br');
    expect(formatPixKey(null)).toBeNull();
  });
});

describe('proposalLine', () => {
  it('builds the payment line skipping empty parts', () => {
    const account: BankAccount = {
      id: 1,
      bank: 'Banrisul',
      branch: '0047',
      accountNumber: '060740190-5',
      accountType: 'Conta corrente jurídica',
      pixKey: '24839705000165',
      holder: 'Carlos Alberto Maineri da Silva',
      defaultAccount: true,
    };
    expect(proposalLine(account)).toBe(
      'Banrisul · Ag. 0047 · C/C 060740190-5 · PIX CNPJ 24.839.705/0001-65 · Titular: Carlos Alberto Maineri da Silva',
    );
    expect(proposalLine({ ...account, pixKey: null, holder: null })).toBe('Banrisul · Ag. 0047 · C/C 060740190-5');
  });
});
