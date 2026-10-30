import { PricingSettings, difference, itemQuote, totalQuote } from './pricing.model';

const settings: PricingSettings = {
  dailyRate: 350,
  indirectPercent: 10,
  marginPercent: 15,
  easyFactor: 0.85,
  normalFactor: 1,
  hardFactor: 1.25,
  veryHardFactor: 1.5,
};

describe('pricing model', () => {
  it('bate com o backend: 30 m² de pintura de parede, difícil', () => {
    const item = itemQuote(settings, 30, 0.0357, 4.46, 'HARD', true);
    expect(item).toEqual({ laborDays: 1.339, laborCost: 468.56, materialCost: 133.8, price: 761.99 });
    const quote = totalQuote(settings, [item], true);
    expect(quote.indirectCost).toBe(60.24);
    expect(quote.margin).toBe(99.39);
    expect(quote.total).toBe(761.99);
  });

  it('soma itens e deixa o material de fora quando não é cobrado', () => {
    const wall = itemQuote(settings, 30, 0.0357, 4.46, 'HARD', true);
    const dumpster = itemQuote(settings, 1, 0.25, 450, null, true);
    expect(dumpster.price).toBe(679.94);
    expect(totalQuote(settings, [wall, dumpster], true).total).toBe(1441.93);

    const own = itemQuote(settings, 30, 0.0357, 4.46, null, false);
    expect(totalQuote(settings, [own], false).total).toBe(474.19);
  });

  it('mostra a diferença em relação ao sugerido', () => {
    expect(difference(1100, 1000)).toBe('+10%');
    expect(difference(900, 1000)).toBe('-10%');
    expect(difference(500, 0)).toBeNull();
  });
});
