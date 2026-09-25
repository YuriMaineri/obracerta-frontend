import { formatTaxId } from './customer.model';

describe('formatTaxId', () => {
  it('formats a CNPJ', () => {
    expect(formatTaxId('24839705000165')).toBe('24.839.705/0001-65');
  });

  it('formats a CPF', () => {
    expect(formatTaxId('12345678909')).toBe('123.456.789-09');
  });

  it('returns empty string for null', () => {
    expect(formatTaxId(null)).toBe('');
  });
});
