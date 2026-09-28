import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { formatCnpj, formatPhone, formatPostalCode, onlyDigits } from '../shared/br-formats';
import { fieldErrorMessage } from '../shared/form-errors';
import { errorMessage } from '../shared/http-error';
import { Icon } from '../shared/icon';
import { MaskDirective } from '../shared/mask.directive';
import { emailValidator, notBlankValidator, phoneValidator, postalCodeValidator, taxIdValidator } from '../shared/validators';
import { CompanyHeader } from './company-header';
import { CompanyRequest } from './company.model';
import { CompanyService } from './company.service';

const MAX_LOGO_BYTES = 1024 * 1024;

@Component({
  selector: 'app-company-details',
  imports: [ReactiveFormsModule, MaskDirective, BlueprintDirective, Icon, CompanyHeader],
  templateUrl: './company-details.html',
  styleUrl: './company-details.scss',
})
export class CompanyDetails implements OnInit {
  private readonly service = inject(CompanyService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hasLogo = signal(false);
  protected readonly logoVersion = signal(Date.now());
  protected readonly logoError = signal<string | null>(null);
  protected readonly logoSize = signal<string | null>(null);

  protected readonly form = this.fb.group({
    legalName: ['', [Validators.required, notBlankValidator, Validators.maxLength(200)]],
    tradeName: ['', [notBlankValidator, Validators.maxLength(200)]],
    taxId: ['', taxIdValidator(() => 'cnpj')],
    signatoryName: ['', [notBlankValidator, Validators.maxLength(150)]],
    phone: ['', phoneValidator],
    email: ['', [emailValidator, Validators.maxLength(150)]],
    address: ['', [notBlankValidator, Validators.maxLength(250)]],
    district: ['', [notBlankValidator, Validators.maxLength(100)]],
    city: ['', [notBlankValidator, Validators.maxLength(100)]],
    postalCode: ['', postalCodeValidator],
  });

  private readonly values = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly preview = computed(() => {
    const v = { ...this.form.getRawValue(), ...this.values() };
    const cep = onlyDigits(v.postalCode).length === 8 ? `CEP ${v.postalCode}` : null;
    const addressParts = [v.address?.trim(), v.district?.trim(), v.city?.trim(), cep].filter(Boolean);
    return {
      name: v.tradeName?.trim() || v.legalName?.trim() || 'Nome da empresa',
      taxId: v.taxId?.trim() || null,
      phone: v.phone?.trim() || null,
      email: v.email?.trim() || null,
      address: addressParts.join(' · ') || null,
      addressIncomplete: !v.address?.trim(),
      signatory: v.signatoryName?.trim() || null,
    };
  });

  protected readonly missing = computed(() => {
    const v = { ...this.form.getRawValue(), ...this.values() };
    const list: string[] = [];
    if (!v.address?.trim()) list.push('endereço');
    if (!v.email?.trim()) list.push('e-mail');
    if (!v.phone?.trim()) list.push('telefone');
    if (!v.taxId?.trim()) list.push('CNPJ');
    return list;
  });

  protected readonly missingMessage = computed(() => {
    const list = this.missing();
    if (list.length === 0) return null;
    const joined = list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} e ${list.at(-1)}`;
    const verb = list.length === 1 ? 'Falta' : 'Faltam';
    return `${verb} ${joined}. Preencha para completar o cabeçalho das propostas.`;
  });

  protected readonly statusLabel = computed(() => {
    const n = this.missing().length;
    if (n === 0) return 'Todos os dados preenchidos';
    return n === 1 ? '1 campo a completar' : `${n} campos a completar`;
  });

  protected readonly fieldError = (name: keyof typeof this.form.controls) =>
    fieldErrorMessage(this.form.controls[name]);

  ngOnInit(): void {
    this.service.get().subscribe({
      next: (c) => {
        this.form.setValue({
          legalName: c.legalName,
          tradeName: c.tradeName ?? '',
          taxId: formatCnpj(c.taxId),
          signatoryName: c.signatoryName ?? '',
          phone: formatPhone(c.phone),
          email: c.email ?? '',
          address: c.address ?? '',
          district: c.district ?? '',
          city: c.city ?? '',
          postalCode: formatPostalCode(c.postalCode),
        });
        this.form.markAsPristine();
        this.hasLogo.set(c.hasLogo);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected isEmpty(name: 'address' | 'email'): boolean {
    return !this.form.controls[name].value.trim();
  }

  protected logoUrl(): string {
    return this.service.logoUrl(this.logoVersion());
  }

  protected onLogoLoaded(img: HTMLImageElement): void {
    this.logoSize.set(`${img.naturalWidth}×${img.naturalHeight} px`);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const text = (value: string) => (value.trim() === '' ? null : value.trim());
    const request: CompanyRequest = {
      legalName: v.legalName.trim(),
      tradeName: text(v.tradeName),
      taxId: onlyDigits(v.taxId) || null,
      signatoryName: text(v.signatoryName),
      phone: onlyDigits(v.phone) || null,
      email: text(v.email)?.toLowerCase() ?? null,
      address: text(v.address),
      district: text(v.district),
      city: text(v.city),
      postalCode: onlyDigits(v.postalCode) || null,
    };

    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.service.update(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        this.form.markAsPristine();
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }

  protected onLogoSelected(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.logoError.set(null);
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.logoError.set('Use uma imagem PNG ou JPEG.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      this.logoError.set('A imagem deve ter no máximo 1 MB.');
      return;
    }
    this.service.uploadLogo(file).subscribe({
      next: () => {
        this.hasLogo.set(true);
        this.logoVersion.set(Date.now());
      },
      error: (e) => this.logoError.set(errorMessage(e)),
    });
  }

  protected removeLogo(): void {
    if (!confirm('Remover o logotipo? Ele deixa de aparecer nas propostas.')) return;
    this.service.removeLogo().subscribe({
      next: () => {
        this.hasLogo.set(false);
        this.logoSize.set(null);
      },
      error: (e) => this.logoError.set(errorMessage(e)),
    });
  }
}
