import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { fieldErrorMessage } from '../shared/form-errors';
import { errorMessage } from '../shared/http-error';
import { formatMoney } from '../estimates/estimate.model';
import { PricingSettings, itemQuote, totalQuote } from '../pricing/pricing.model';
import { PricingApi } from '../pricing/pricing.service';
import { CompanyHeader } from './company-header';

type Field = 'dailyRate' | 'indirectPercent' | 'marginPercent' | 'easyFactor' | 'normalFactor' | 'hardFactor' | 'veryHardFactor';

@Component({
  selector: 'app-pricing-settings',
  imports: [ReactiveFormsModule, BlueprintDirective, CompanyHeader],
  templateUrl: './pricing-settings.html',
  styleUrl: './company-details.scss',
})
export class PricingSettingsPage implements OnInit {
  private readonly api = inject(PricingApi);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly savedAt = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formatMoney = formatMoney;

  private readonly factor = [Validators.required, Validators.min(0.1), Validators.max(5)];
  private readonly percent = [Validators.required, Validators.min(0), Validators.max(100)];

  protected readonly form = this.fb.group({
    dailyRate: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    indirectPercent: this.fb.control<number | null>(null, this.percent),
    marginPercent: this.fb.control<number | null>(null, this.percent),
    easyFactor: this.fb.control<number | null>(null, this.factor),
    normalFactor: this.fb.control<number | null>(null, this.factor),
    hardFactor: this.fb.control<number | null>(null, this.factor),
    veryHardFactor: this.fb.control<number | null>(null, this.factor),
  });

  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** Exemplo ao vivo: 30 m² de pintura de parede (rende 28 m²/dia, R$ 4,46 de material por m²). */
  protected readonly example = computed(() => {
    const v = this.values();
    if (this.form.invalid || v.dailyRate == null) return null;
    const s = v as PricingSettings;
    const normal = itemQuote(s, 30, 0.0357, 4.46, 'NORMAL', true);
    const hard = itemQuote(s, 30, 0.0357, 4.46, 'HARD', true);
    return { normal, quote: totalQuote(s, [normal], true), hard };
  });

  protected readonly fieldError = (name: Field) => fieldErrorMessage(this.form.controls[name]);

  ngOnInit(): void {
    this.api.get().subscribe({
      next: (s) => {
        this.patch(s);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.update(this.form.getRawValue() as PricingSettings).subscribe({
      next: (s) => {
        this.patch(s);
        this.saving.set(false);
        this.savedAt.set(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }

  private patch(s: PricingSettings): void {
    this.form.setValue({
      dailyRate: s.dailyRate,
      indirectPercent: s.indirectPercent,
      marginPercent: s.marginPercent,
      easyFactor: s.easyFactor,
      normalFactor: s.normalFactor,
      hardFactor: s.hardFactor,
      veryHardFactor: s.veryHardFactor,
    });
    this.form.markAsPristine();
  }
}
