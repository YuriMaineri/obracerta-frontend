import { Component, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CustomerRequest, PersonType, formatTaxId } from './customer.model';
import { CustomerService, errorMessage } from './customer.service';

@Component({
  selector: 'app-customer-form',
  imports: [ReactiveFormsModule, RouterLink],
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
    name: ['', [Validators.required, Validators.maxLength(200)]],
    taxId: [''],
    contactPerson: ['', Validators.maxLength(150)],
    phone: ['', Validators.maxLength(30)],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    address: ['', Validators.maxLength(250)],
    district: ['', Validators.maxLength(100)],
    city: ['Porto Alegre', Validators.maxLength(100)],
    postalCode: ['', Validators.maxLength(10)],
  });

  protected get isEditing(): boolean {
    return !!this.id();
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
          phone: c.phone ?? '',
          email: c.email ?? '',
          address: c.address ?? '',
          district: c.district ?? '',
          city: c.city ?? '',
          postalCode: c.postalCode ?? '',
        }),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    // Campos vazios vao como null para o banco nao guardar string vazia.
    const values = this.form.getRawValue();
    const request = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]),
    ) as unknown as CustomerRequest;

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
