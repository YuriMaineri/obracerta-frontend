import { Clause, groupClauses } from './company.model';

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
