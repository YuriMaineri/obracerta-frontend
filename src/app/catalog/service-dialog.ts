import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { Dialog } from '../shared/dialog';
import { fieldErrorMessage } from '../shared/form-errors';
import { errorMessage } from '../shared/http-error';
import { Icon } from '../shared/icon';
import { notBlankValidator } from '../shared/validators';
import { formatMoney } from '../estimates/estimate.model';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  Material,
  SERVICE_UNITS,
  ServiceCategory,
  ServiceItem,
  UNIT_SYMBOLS,
  Unit,
  daysToYield,
  lineCost,
  yieldToDays,
} from './catalog.model';
import { CatalogApi } from './catalog.service';

type LineGroup = FormGroup<{
  materialId: FormControl<number | null>;
  quantityPerUnit: FormControl<number | null>;
  wastePercent: FormControl<number | null>;
}>;

@Component({
  selector: 'app-service-dialog',
  imports: [ReactiveFormsModule, Dialog, BlueprintDirective, Icon],
  templateUrl: './service-dialog.html',
  styles: `
    .section-title { font-family: var(--font-heading); font-weight: 600; font-size: 18px; margin: 8px 0 4px; }
    .hint { font-size: 13px; }
    .lines { display: flex; flex-direction: column; gap: 8px; }
    .line {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 110px 90px 100px 36px;
      gap: 8px;
      align-items: center;
    }
    .line.head { font-size: 12px; color: var(--color-neutral-700); }
    .cost { text-align: right; font-size: 14px; }
    .icon-only { border-color: transparent; color: var(--color-neutral-700); }
    .add { align-self: flex-start; }
    .total {
      display: flex;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid var(--color-divider);
      font-weight: 500;
    }
  `,
})
export class ServiceDialog implements OnInit {
  private readonly api = inject(CatalogApi);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly service = input<ServiceItem | null>(null);
  readonly saved = output<ServiceItem>();
  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly materials = signal<Material[]>([]);
  protected readonly categories = CATEGORIES;
  protected readonly categoryLabel = CATEGORY_LABELS;
  protected readonly units = SERVICE_UNITS;
  protected readonly symbols = UNIT_SYMBOLS;
  protected readonly formatMoney = formatMoney;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, notBlankValidator, Validators.maxLength(200)]],
    category: this.fb.control<ServiceCategory>('OTHER'),
    unit: this.fb.control<Unit>('SQUARE_METER'),
    productivity: this.fb.control<number | null>(null, Validators.min(0)),
    usualPrice: this.fb.control<number | null>(null, Validators.min(0)),
    proposalDescription: ['', Validators.maxLength(2000)],
    composition: this.fb.array<LineGroup>([]),
  });

  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly unitSymbol = computed(() => UNIT_SYMBOLS[(this.values().unit ?? 'SQUARE_METER') as Unit]);
  protected readonly lumpSum = computed(() => this.values().unit === 'LUMP_SUM');

  protected readonly costs = computed(() => {
    const byId = new Map(this.materials().map((m) => [m.id, m]));
    return (this.values().composition ?? []).map((l) => {
      const m = l?.materialId == null ? undefined : byId.get(l.materialId);
      return m && l?.quantityPerUnit ? lineCost(l.quantityPerUnit, l.wastePercent ?? 0, m.price) : null;
    });
  });

  protected readonly total = computed(() => this.costs().reduce<number>((sum, c) => sum + (c ?? 0), 0));

  protected readonly missingPrice = computed(() => {
    const byId = new Map(this.materials().map((m) => [m.id, m]));
    return (this.values().composition ?? []).some((l) => l?.materialId != null && byId.get(l.materialId)?.price == null);
  });

  protected readonly fieldError = (name: 'name' | 'productivity' | 'usualPrice' | 'proposalDescription') =>
    fieldErrorMessage(this.form.controls[name]);

  get lines(): FormArray<LineGroup> {
    return this.form.controls.composition;
  }

  ngOnInit(): void {
    const s = this.service();
    const extra: Material[] = s
      ? s.composition.map((c) => ({
          id: c.materialId,
          name: c.materialName,
          unit: c.materialUnit,
          price: c.materialPrice,
          supplier: null,
          updatedOn: null,
          usedBy: [],
        }))
      : [];
    this.materials.set(extra);
    this.api.listMaterials().subscribe({
      next: (list) => {
        const missing = extra.filter((e) => !list.some((m) => m.id === e.id));
        this.materials.set([...list, ...missing]);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });

    if (!s) {
      this.addLine();
      return;
    }
    this.form.patchValue({
      name: s.name,
      category: s.category ?? 'OTHER',
      unit: s.unit,
      productivity: s.unit === 'LUMP_SUM' ? s.daysPerUnit : daysToYield(s.daysPerUnit),
      usualPrice: s.usualPrice,
      proposalDescription: s.proposalDescription ?? '',
    });
    s.composition.forEach((c) => this.addLine(c.materialId, c.quantityPerUnit, c.wastePercent));
  }

  protected addLine(materialId: number | null = null, quantity: number | null = null, waste: number | null = 0): void {
    this.lines.push(
      this.fb.group({
        materialId: this.fb.control<number | null>(materialId, Validators.required),
        quantityPerUnit: this.fb.control<number | null>(quantity, [Validators.required, Validators.min(0.0001)]),
        wastePercent: this.fb.control<number | null>(waste, [Validators.min(0), Validators.max(100)]),
      }),
    );
  }

  protected removeLine(index: number): void {
    this.lines.removeAt(index);
  }

  protected materialUnit(index: number): string {
    const id = this.lines.at(index).controls.materialId.value;
    const m = this.materials().find((x) => x.id === id);
    return m ? UNIT_SYMBOLS[m.unit] : '';
  }

  protected save(): void {
    const filled = this.lines.controls.filter((g) => g.controls.materialId.value != null || g.controls.quantityPerUnit.value != null);
    this.lines.controls
      .filter((g) => !filled.includes(g))
      .forEach((g) => this.lines.removeAt(this.lines.controls.indexOf(g)));
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(this.lines.invalid ? 'Confira a composição: cada linha precisa do insumo e do consumo por unidade.' : null);
      return;
    }
    const v = this.form.getRawValue();
    const days = v.unit === 'LUMP_SUM' ? v.productivity : yieldToDays(v.productivity);
    this.saving.set(true);
    this.error.set(null);
    this.api
      .saveService(this.service()?.id ?? null, {
        name: v.name.trim(),
        category: v.category,
        unit: v.unit,
        proposalDescription: v.proposalDescription.trim() || null,
        daysPerUnit: days,
        usualPrice: v.usualPrice,
        composition: v.composition.map((l) => ({
          materialId: l.materialId as number,
          quantityPerUnit: l.quantityPerUnit as number,
          wastePercent: l.wastePercent,
        })),
      })
      .subscribe({
        next: (s) => this.saved.emit(s),
        error: (e) => {
          this.error.set(errorMessage(e));
          this.saving.set(false);
        },
      });
  }
}
