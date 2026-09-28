import { formatDate, formatLeadTime, formatMoney, sumMaterials } from './estimate.model';

describe('estimate formatting', () => {
  it('formats lead time the way the documents do', () => {
    expect(formatLeadTime(4, 5)).toBe('4 a 5 dias úteis');
    expect(formatLeadTime(2, 2)).toBe('2 dias úteis');
    expect(formatLeadTime(null, 1)).toBe('1 dia útil');
    expect(formatLeadTime(null, null)).toBe('Não informado');
  });

  it('formats ISO dates without timezone shifts', () => {
    expect(formatDate('2026-08-20')).toBe('20/08/2026');
    expect(formatDate(null)).toBe('—');
  });

  it('formats money in reais', () => {
    expect(formatMoney(1800).replace(/\s/g, ' ')).toBe('R$ 1.800,00');
    expect(formatMoney(null)).toBe('—');
  });

  it('sums only priced materials', () => {
    expect(sumMaterials([
      { description: 'a', quantity: null, totalPrice: 299 },
      { description: 'b', quantity: null, totalPrice: null },
      { description: 'c', quantity: null, totalPrice: 70.2 },
    ])).toBeCloseTo(369.2);
  });
});
