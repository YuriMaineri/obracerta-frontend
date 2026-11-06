import type { PricingSettings, ShoppingItem } from '../pricing/pricing.model';
import { formatDate, formatLeadTime, formatMoney, materialLinesFrom, sumMaterials } from './estimate.model';

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

describe('materials brought from the services', () => {
  const settings: PricingSettings = {
    dailyRate: 350, indirectPercent: 10, marginPercent: 15, easyFactor: 0.85, normalFactor: 1, hardFactor: 1.25, veryHardFactor: 1.5,
  };
  const item = (s: Partial<ShoppingItem>): ShoppingItem => ({
    materialId: 1, material: '', unit: 'PIECE', packageName: null, packageSize: null, needed: 0, packages: null, bought: 0,
    leftover: 0, unitPrice: null, cost: null, purchaseCost: null, ...s,
  });
  const shopping = [
    item({ materialId: 1, material: 'Tinta acrílica fosca', unit: 'LITER', packageName: 'galão', packageSize: 3.6, needed: 7.056, packages: 2, bought: 7.2, purchaseCost: 172.8 }),
    item({ materialId: 2, material: 'Massa corrida PVA', unit: 'KILOGRAM', packageName: 'balde', packageSize: 25, needed: 12, packages: 1, bought: 25, purchaseCost: 90 }),
    item({ materialId: 3, material: 'Lixa (folha)', unit: 'PIECE', needed: 4.2, packages: 5, bought: 5, purchaseCost: 7.5 }),
    item({ materialId: 4, material: 'Areia média', unit: 'CUBIC_METER', needed: 0.4125, bought: 0.4125, purchaseCost: 66 }),
  ];

  it('describes what to buy and charges the purchase with indirect cost and margin', () => {
    expect(materialLinesFrom(shopping, settings, true)).toEqual([
      { description: 'Tinta acrílica fosca — 2 galões de 3,6 L', quantity: 2, totalPrice: 218.59, materialId: 1 },
      { description: 'Massa corrida PVA — 1 balde de 25 kg', quantity: 1, totalPrice: 113.85, materialId: 2 },
      { description: 'Lixa (folha) — 5 un', quantity: 5, totalPrice: 9.49, materialId: 3 },
      { description: 'Areia média — 0,42 m³', quantity: 0.42, totalPrice: 83.49, materialId: 4 },
    ]);
  });

  it('leaves the price out when the material is not charged', () => {
    expect(materialLinesFrom(shopping, settings, false).map((l) => l.totalPrice)).toEqual([null, null, null, null]);
  });
});
