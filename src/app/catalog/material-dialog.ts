import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { Dialog } from '../shared/dialog';
import { fieldErrorMessage } from '../shared/form-errors';
import { errorMessage } from '../shared/http-error';
import { notBlankValidator } from '../shared/validators';
import { MATERIAL_UNITS, Material, UNIT_SYMBOLS, Unit } from './catalog.model';
import { CatalogApi } from './catalog.service';

@Component({
  selector: 'app-material-dialog',
  imports: [ReactiveFormsModule, Dialog, BlueprintDirective],
  template: `
    <app-dialog [title]="material() ? 'Editar insumo' : 'Novo insumo'" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="dialog-form">
        <div class="dialog-body">
          @if (error(); as message) {
            <div class="alert-error" role="alert">{{ message }}</div>
          }
          <div class="form-grid">
            <div class="field wide">
              <label for="m-name">Insumo *</label>
              <input id="m-name" formControlName="name" placeholder="Ex.: Tinta acrílica fosca" />
              @if (fieldError('name'); as msg) { <small class="field-error">{{ msg }}</small> }
            </div>
            <div class="field">
              <label for="m-unit">Unidade de compra *</label>
              <select id="m-unit" formControlName="unit">
                @for (u of units; track u) { <option [value]="u">{{ symbols[u] }}</option> }
              </select>
            </div>
            <div class="field">
              <label for="m-price">Preço por unidade (R$)</label>
              <input id="m-price" type="number" min="0" step="0.01" formControlName="price" placeholder="0,00" />
              @if (fieldError('price'); as msg) { <small class="field-error">{{ msg }}</small> }
            </div>
            <div class="field wide">
              <label for="m-supplier">Fornecedor</label>
              <input id="m-supplier" formControlName="supplier" placeholder="Onde costuma comprar" />
            </div>
          </div>
          <p class="muted" style="font-size: 13px">Mudar o preço guarda o valor antigo no histórico.</p>
        </div>
        <div class="dialog-footer">
          <button type="button" class="btn btn-secondary" (click)="closed.emit()">Cancelar</button>
          <button type="submit" class="btn btn-primary" appBlueprint [disabled]="saving()">
            {{ saving() ? 'Salvando…' : 'Salvar insumo' }}
          </button>
        </div>
      </form>
    </app-dialog>
  `,
})
export class MaterialDialog implements OnInit {
  private readonly api = inject(CatalogApi);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly material = input<Material | null>(null);
  readonly saved = output<Material>();
  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly units = MATERIAL_UNITS;
  protected readonly symbols = UNIT_SYMBOLS;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, notBlankValidator, Validators.maxLength(200)]],
    unit: this.fb.control<Unit>('PIECE'),
    price: this.fb.control<number | null>(null, Validators.min(0)),
    supplier: ['', Validators.maxLength(150)],
  });

  protected readonly fieldError = (name: keyof typeof this.form.controls) =>
    fieldErrorMessage(this.form.controls[name]);

  ngOnInit(): void {
    const m = this.material();
    if (m) {
      this.form.setValue({ name: m.name, unit: m.unit, price: m.price, supplier: m.supplier ?? '' });
    }
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.api
      .saveMaterial(this.material()?.id ?? null, {
        name: v.name.trim(),
        unit: v.unit,
        price: v.price,
        supplier: v.supplier.trim() || null,
      })
      .subscribe({
        next: (m) => this.saved.emit(m),
        error: (e) => {
          this.error.set(errorMessage(e));
          this.saving.set(false);
        },
      });
  }
}
