import { daysToYield, lineCost, productivityLabel, yieldToDays } from './catalog.model';

describe('catalog model', () => {
  it('calcula o custo da linha com perda, como o backend', () => {
    expect(lineCost(0.16, 5, 24)).toBe(4.03);
    expect(lineCost(5, 10, 8)).toBe(44);
    expect(lineCost(1, null, 2.5)).toBe(2.5);
    expect(lineCost(1, 0, null)).toBeNull();
  });

  it('converte rendimento por dia em diárias por unidade e de volta', () => {
    expect(yieldToDays(28)).toBe(0.0357);
    expect(daysToYield(0.0357)).toBe(28);
    expect(yieldToDays(0)).toBeNull();
    expect(daysToYield(null)).toBeNull();
  });

  it('descreve a produtividade conforme a unidade', () => {
    expect(productivityLabel({ unit: 'SQUARE_METER', daysPerUnit: 0.0357 })).toBe('28 m² por dia');
    expect(productivityLabel({ unit: 'LUMP_SUM', daysPerUnit: 0.25 })).toBe('0,25 diárias no total');
    expect(productivityLabel({ unit: 'POINT', daysPerUnit: 0.25 })).toBe('4 pontos por dia');
    expect(productivityLabel({ unit: 'PIECE', daysPerUnit: null })).toBe('Não informado');
  });
});
