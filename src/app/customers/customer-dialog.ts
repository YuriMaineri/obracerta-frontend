import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { distinctUntilChanged } from 'rxjs';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { formatPhone, formatPostalCode, onlyDigits } from '../shared/br-formats';
import { Dialog } from '../shared/dialog';
import { fieldErrorMessage } from '../shared/form-errors';
import { errorMessage } from '../shared/http-error';
import { MaskDirective } from '../shared/mask.directive';
import {
  emailValidator,
  notBlankValidator,
  phoneValidator,
  postalCodeValidator,
  taxIdValidator,
} from '../shared/validators';
import { Customer, CustomerRequest, PersonType, formatTaxId } from './customer.model';
import { CustomerService } from './customer.service';

@Component({
  selector: 'app-customer-dialog',
  imports: [ReactiveFormsModule, Dialog, BlueprintDirective, MaskDirective],
  templateUrl: './customer-dialog.html',
})
export class CustomerDialog implements OnInit {
  private readonly service = inject(CustomerService);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Cliente em edição; ausente para cadastro novo. */
  readonly customer = input<Customer | null>(null);
  readonly saved = output<Customer>();
  readonly closed = output<void>();

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

  protected readonly fieldError = (name: keyof typeof this.form.controls) =>
    fieldErrorMessage(this.form.controls[name], this.isCompany ? 'CNPJ' : 'CPF');

  constructor() {
    this.form.controls.personType.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.form.controls.taxId.reset(''));
  }

  protected get isCompany(): boolean {
    return this.form?.controls.personType.value === 'COMPANY';
  }

  protected get title(): string {
    return this.customer() ? 'Editar cliente' : 'Novo cliente';
  }

  ngOnInit(): void {
    const c = this.customer();
    if (!c) return;
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
    });
  }

  protected setPersonType(type: PersonType): void {
    this.form.controls.personType.setValue(type);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const text = (value: string) => (value.trim() === '' ? null : value.trim());
    const digits = (value: string) => onlyDigits(value) || null;
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

    this.saving.set(true);
    this.error.set(null);
    const current = this.customer();
    const call = current ? this.service.update(current.id, request) : this.service.create(request);
    call.subscribe({
      next: (customer) => this.saved.emit(customer),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }
}
