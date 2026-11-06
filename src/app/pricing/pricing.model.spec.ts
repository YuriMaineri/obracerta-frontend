import { CompositionLine } from '../catalog/catalog.model';
import { PricingSettings, difference, itemQuote, materialUse, purchase, shoppingList, totalQuote } from './pricing.model';

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

  // Mesmos casos do PurchaseTest e do SuggestedPriceIntegrationTest no backend.
  const paint: CompositionLine = {
    materialId: 1, materialName: 'Tinta acrílica fosca', materialUnit: 'LITER', materialPrice: 24,
    packageName: 'galão', packageSize: 3.6, quantityPerUnit: 0.16, wastePercent: 5, costPerUnit: 4.03,
  };
  const sandpaper: CompositionLine = {
    materialId: 2, materialName: 'Lixa (folha)', materialUnit: 'PIECE', materialPrice: 2.5,
    packageName: null, packageSize: null, quantityPerUnit: 0.1, wastePercent: 0, costPerUnit: 0.25,
  };

  it('calcula o consumo e o custo de cada insumo do serviço', () => {
    const use = materialUse(30, paint);
    expect(use.quantity).toBe(5.04);
    expect(use.cost).toBe(120.9);
    expect(materialUse(1, { ...paint, costPerUnit: null }).cost).toBeNull();
  });

  it('arredonda a compra para embalagem fechada ou unidade inteira', () => {
    expect(purchase('LITER', 3.6, 5.04, 24)).toEqual({ packages: 2, bought: 7.2, leftover: 2.16, cost: 172.8 });
    expect(purchase('LITER', 3.6, 7.2, 24).leftover).toBe(0);
    expect(purchase('BAG', null, 2.3, 38)).toEqual({ packages: 3, bought: 3, leftover: 0.7, cost: 114 });
    expect(purchase('CUBIC_METER', null, 0.4125, 160)).toEqual({ packages: null, bought: 0.4125, leftover: 0, cost: 66 });
  });

  it('soma o mesmo insumo de vários serviços antes de arredondar', () => {
    const list = shoppingList([materialUse(30, paint), materialUse(30, sandpaper), materialUse(12, paint), materialUse(12, sandpaper)]);
    expect(list.map((i) => i.material)).toEqual(['Tinta acrílica fosca', 'Lixa (folha)']);
    expect(list[0]).toMatchObject({ needed: 7.056, packages: 2, leftover: 0.144, cost: 169.26, purchaseCost: 172.8 });
    expect(list[1]).toMatchObject({ needed: 4.2, packages: 5, cost: 10.5, purchaseCost: 12.5 });
  });
});
