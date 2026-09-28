import { Component, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { distinctUntilChanged } from 'rxjs';
import { formatPhone, formatPostalCode, onlyDigits } from '../shared/br-formats';
import { MaskDirective } from '../shared/mask.directive';
import {
  emailValidator,
  notBlankValidator,
  phoneValidator,
  postalCodeValidator,
  taxIdValidator,
} from '../shared/validators';
import { CustomerRequest, PersonType, formatTaxId } from './customer.model';
import { errorMessage } from '../shared/http-error';
import { CustomerService } from './customer.service';

type FieldName = 'name' | 'taxId' | 'contactPerson' | 'phone' | 'email' | 'address' | 'district' | 'city' | 'postalCode';

@Component({
  selector: 'app-customer-form',
  imports: [ReactiveFormsModule, RouterLink, MaskDirective],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.scss',
})
export class CustomerForm implements OnInit {
  private readonly service = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Vem da rota /customers/:id (withComponentInputBinding). Ausente em /customers/new. */
  readonly id = input<string>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    personType: this.fb.control<PersonType>('COMPANY', Validators.required),
    name: ['', [Validators.required, notBlankValidator, Validators.maxLength(200)]],
    taxId: ['', taxIdValidator(() => (this.isCompany ? 'cnpj' : 'cpf'))],
    contactPerson: ['', [notBlankValidator, Validators.maxLength(150)]],
    phone: ['', phoneValidator],
    email: ['', [emailValidator, Validators.maxLength(150)]],
    address: ['', [notBlankValidator, Validators.maxLength(250)]],
    district: ['', [notBlankValidator, Validators.maxLength(100)]],
    city: ['Porto Alegre', [notBlankValidator, Validators.maxLength(100)]],
    postalCode: ['', postalCodeValidator],
  });

  constructor() {
    // Ao trocar PF <-> PJ, o documento digitado deixa de fazer sentido: limpa o campo.
    this.form.controls.personType.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.form.controls.taxId.reset('');
      });
  }

  protected get isEditing(): boolean {
    return !!this.id();
  }

  protected get isCompany(): boolean {
    return this.form?.controls.personType.value === 'COMPANY';
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    this.service.findById(Number(id)).subscribe({
      next: (c) =>
        this.form.setValue({
          personType: c.personType,
          name: c.name,
          taxId: formatTaxId(c.taxId),
          contactPerson: c.contactPerson ?? '',
          phone: formatPhone(c.phone),
          email: c.email ?? '',
          address: c.address ?? '',
          district: c.district ?? '',
          city: c.city ?? '',
          postalCode: formatPostalCode(c.postalCode),
        }),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  /** Mensagem do primeiro erro do campo, so depois que a pessoa passou por ele. */
  protected fieldError(field: FieldName): string | null {
    const control = this.form.controls[field];
    if (!control.errors || !control.touched) return null;
    const e = control.errors;
    if (e['required'] || e['blank']) return 'Obrigatório.';
    if (e['taxIdIncomplete']) return `${this.isCompany ? 'CNPJ' : 'CPF'} incompleto.`;
    if (e['taxIdInvalid']) return `${this.isCompany ? 'CNPJ' : 'CPF'} inválido. Confira os dígitos.`;
    if (e['email']) return 'E-mail inválido. Ex.: nome@empresa.com.br';
    if (e['phone']) return 'Telefone inválido. Ex.: (51) 3333-4444 ou (51) 99999-8888';
    if (e['postalCode']) return 'CEP deve ter 8 dígitos.';
    if (e['maxlength']) return `Máximo de ${e['maxlength'].requiredLength} caracteres.`;
    return 'Valor inválido.';
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const text = (value: string) => (value.trim() === '' ? null : value.trim());
    const digits = (value: string) => onlyDigits(value) || null;

    // Documento, telefone e CEP vao so com digitos; a mascara e apenas de exibicao.
    const request: CustomerRequest = {
      personType: v.personType,
      name: v.name.trim(),
      taxId: digits(v.taxId),
      contactPerson: text(v.contactPerson),
      phone: digits(v.phone),
      email: text(v.email)?.toLowerCase() ?? null,
      address: text(v.address),
      district: text(v.district),
      city: text(v.city),
      postalCode: digits(v.postalCode),
    };

    const id = this.id();
    const call = id ? this.service.update(Number(id), request) : this.service.create(request);

    call.subscribe({
      next: () => this.router.navigate(['/customers']),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }
}
