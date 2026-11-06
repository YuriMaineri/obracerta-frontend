import { Component, computed, input, output } from '@angular/core';
import { Unit, formatQuantity, packageLabel, unitLabel } from '../catalog/catalog.model';
import { ItemQuote, MaterialUse, PricingSettings, Quote, ShoppingItem } from '../pricing/pricing.model';
import { Dialog } from '../shared/dialog';
import { formatMoney } from './estimate.model';

/** Um serviço do orçamento ligado ao catálogo, com tudo o que entrou na conta. */
export interface MemoryItem {
  description: string;
  serviceName: string;
  unit: Unit;
  quantity: number;
  daysPerUnit: number | null;
  difficultyLabel: string;
  factor: number;
  quote: ItemQuote;
  materials: MaterialUse[];
}

/** Memória de cálculo (US040) e lista de compra (US031). Só para o prestador; nada disto vai para o PDF. */
@Component({
  selector: 'app-calculation-memory',
  imports: [Dialog],
  template: `
    <app-dialog title="Memória de cálculo" [width]="980" (closed)="closed.emit()">
      <div class="dialog-body">
        <p class="muted intro">
          Como o preço sugerido foi calculado, serviço por serviço, com os valores atuais do catálogo e de
          <em>Empresa › Preço e mão de obra</em>.
        </p>

        @for (item of items(); track $index) {
          <section class="item">
            <header>
              <div>
                <h4>{{ item.description || item.serviceName }}</h4>
                <span class="muted">{{ item.serviceName }} · {{ qty(item.quantity) }} {{ symbol(item.unit, item.quantity) }} · {{ item.difficultyLabel }}</span>
              </div>
              <span class="numeric price" title="Preço sugerido do serviço, com custo indireto e margem">{{ money(item.quote.price) }}</span>
            </header>

            <div class="formula">
              <span class="label">Mão de obra</span>
              <span class="numeric">
                {{ qty(item.quantity) }} {{ symbol(item.unit, item.quantity) }} × {{ qty(item.daysPerUnit ?? 0) }} diária/{{ symbol(item.unit) }}
                × {{ qty(item.factor) }} ({{ item.difficultyLabel.toLowerCase() }}) = {{ qty(item.quote.laborDays) }}
                {{ item.quote.laborDays === 1 ? 'diária' : 'diárias' }} × {{ money(settings().dailyRate) }}
              </span>
              <strong class="numeric">{{ money(item.quote.laborCost) }}</strong>
            </div>

            @if (item.materials.length) {
              <table class="table compact">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th class="right">Consumo por {{ symbol(item.unit) }}</th>
                    <th class="right">Perda</th>
                    <th class="right">Quantidade</th>
                    <th class="right">Preço</th>
                    <th class="right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of item.materials; track m.materialId) {
                    <tr>
                      <td class="name">{{ m.material }}</td>
                      <td class="right numeric">{{ qty(m.quantityPerUnit) }} {{ symbol(m.unit, m.quantityPerUnit) }}</td>
                      <td class="right numeric">{{ qty(m.wastePercent) }}%</td>
                      <td class="right numeric">{{ qty(m.quantity) }} {{ symbol(m.unit, m.quantity) }}</td>
                      <td class="right numeric" [class.missing]="m.unitPrice == null">{{ m.unitPrice == null ? 'sem preço' : money(m.unitPrice) + '/' + symbol(m.unit) }}</td>
                      <td class="right numeric">{{ money(m.cost) }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5">Material{{ quote().materialCharged ? '' : ' (não entra no preço)' }}</td>
                    <td class="right numeric">{{ money(item.quote.materialCost) }}</td>
                  </tr>
                </tfoot>
              </table>
            } @else {
              <p class="muted small">Serviço sem insumos na composição.</p>
            }
          </section>
        }

        @if (shopping().length) {
          <section class="item">
            <header>
              <div>
                <h4>Lista de compra</h4>
                <span class="muted">Insumos somados em todos os serviços e arredondados para embalagem fechada.</span>
              </div>
            </header>
            <table class="table compact">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th class="right">Precisa</th>
                  <th class="right">Comprar</th>
                  <th class="right">Sobra</th>
                  <th class="right">No preço</th>
                  <th class="right">Na compra</th>
                </tr>
              </thead>
              <tbody>
                @for (s of shopping(); track s.materialId) {
                  <tr>
                    <td class="name">{{ s.material }}</td>
                    <td class="right numeric">{{ qty(s.needed) }} {{ symbol(s.unit, s.needed) }}</td>
                    <td class="right numeric">{{ toBuy(s) }}</td>
                    <td class="right numeric" [class.muted]="!s.leftover">{{ s.leftover ? qty(s.leftover) + ' ' + symbol(s.unit, s.leftover) : '—' }}</td>
                    <td class="right numeric">{{ money(s.cost) }}</td>
                    <td class="right numeric">{{ money(s.purchaseCost) }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4">Total de material</td>
                  <td class="right numeric">{{ money(shoppingTotals().cost) }}</td>
                  <td class="right numeric">{{ money(shoppingTotals().purchase) }}</td>
                </tr>
              </tfoot>
            </table>
            @if (shoppingTotals().leftover > 0) {
              <p class="muted small">
                A sobra de embalagem custa {{ money(shoppingTotals().leftover) }} e <strong>não entra no preço sugerido</strong>,
                que considera só o consumo. Se for cobrar a embalagem inteira, ajuste o valor do orçamento.
              </p>
            }
            @if (shoppingTotals().missingPrice) {
              <p class="missing small">Há insumos sem preço no catálogo: o custo de material está incompleto.</p>
            }
          </section>
        }

        <section class="item totals">
          <header><h4>Preço sugerido</h4></header>
          <div class="sum">
            <span>Mão de obra · {{ qty(quote().laborDays) }} {{ quote().laborDays === 1 ? 'diária' : 'diárias' }}</span>
            <span class="numeric">{{ money(quote().laborCost) }}</span>
          </div>
          <div class="sum" [class.muted]="!quote().materialCharged">
            <span>Material{{ quote().materialCharged ? '' : ' (não entra no preço)' }}</span>
            <span class="numeric">{{ money(quote().materialCost) }}</span>
          </div>
          <div class="sum"><span>Custo indireto · {{ settings().indirectPercent }}% sobre o custo direto</span><span class="numeric">{{ money(quote().indirectCost) }}</span></div>
          <div class="sum"><span>Margem · {{ settings().marginPercent }}% sobre custo direto + indireto</span><span class="numeric">{{ money(quote().margin) }}</span></div>
          <div class="sum total"><span>Sugerido</span><span class="numeric">{{ money(quote().total) }}</span></div>
        </section>
      </div>
      <div class="dialog-footer">
        <button type="button" class="btn btn-secondary" (click)="closed.emit()">Fechar</button>
      </div>
    </app-dialog>
  `,
  styles: `
    .intro { font-size: 13px; margin: 0; }
    .small { font-size: 13px; margin: 0; }
    .item { display: flex; flex-direction: column; gap: 10px; padding-bottom: 20px; border-bottom: 1px solid var(--color-divider); }
    .item:last-child { border-bottom: 0; padding-bottom: 0; }
    .item header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
    .item header .muted { font-size: 13px; }
    h4 { margin: 0 0 2px; font-family: var(--font-heading); font-size: 19px; font-weight: 600; }
    .price { font-family: var(--font-heading); font-weight: 600; font-size: 20px; white-space: nowrap; }
    .formula {
      display: grid;
      grid-template-columns: 110px minmax(0, 1fr) auto;
      gap: 12px;
      align-items: baseline;
      padding: 10px 12px;
      background: var(--color-accent-100);
      font-size: 13px;
    }
    .formula .label { color: var(--color-accent-800); font-weight: 600; }
    .table.compact td { height: 40px; padding: 0 12px; }
    .table.compact th { padding: 8px 12px; }
    .table.compact td.name { white-space: normal; }
    .table tfoot td { height: 40px; padding: 0 12px; font-weight: 600; border-bottom: 0; }
    .right { text-align: right; }
    .totals .sum { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    .totals .total {
      padding-top: 8px;
      border-top: 1px solid var(--color-divider);
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: 22px;
    }
  `,
})
export class CalculationMemory {
  readonly items = input.required<MemoryItem[]>();
  readonly shopping = input.required<ShoppingItem[]>();
  readonly quote = input.required<Quote>();
  readonly settings = input.required<PricingSettings>();
  readonly closed = output<void>();

  protected readonly shoppingTotals = computed(() => {
    const list = this.shopping();
    const cost = list.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    const purchase = list.reduce((sum, s) => sum + (s.purchaseCost ?? 0), 0);
    return {
      cost,
      purchase,
      leftover: Math.round((purchase - cost) * 100) / 100,
      missingPrice: list.some((s) => s.unitPrice == null),
    };
  });

  protected readonly money = (value: number | null) => (value == null ? '—' : formatMoney(value));
  protected readonly qty = formatQuantity;
  protected readonly symbol = unitLabel;

  /** "2 × galão de 3,6 L", "5 un" ou, sem arredondamento, a própria quantidade. */
  protected toBuy(s: ShoppingItem): string {
    const pack = packageLabel(s);
    if (pack) return `${formatQuantity(s.packages)} × ${pack}`;
    return `${formatQuantity(s.bought)} ${unitLabel(s.unit, s.bought)}`;
  }
}
