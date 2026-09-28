import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fieldErrorMessage } from '../shared/form-errors';
import { errorMessage } from '../shared/http-error';
import { notBlankValidator } from '../shared/validators';
import { BankAccount, BankAccountRequest } from './company.model';
import { CompanyService } from './company.service';

@Component({
  selector: 'app-bank-accounts',
  imports: [ReactiveFormsModule],
  templateUrl: './bank-accounts.html',
  styleUrl: './company-lists.scss',
})
export class BankAccounts implements OnInit {
  private readonly service = inject(CompanyService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly accounts = signal<BankAccount[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    bank: ['', [Validators.required, notBlankValidator, Validators.maxLength(100)]],
    branch: ['', Validators.maxLength(20)],
    accountNumber: ['', Validators.maxLength(30)],
    accountType: ['Conta corrente jurídica', Validators.maxLength(30)],
    pixKey: ['', Validators.maxLength(150)],
    holder: ['', Validators.maxLength(200)],
    defaultAccount: [false],
  });

  protected readonly fieldError = (name: keyof typeof this.form.controls) =>
    fieldErrorMessage(this.form.controls[name]);

  ngOnInit(): void {
    this.load();
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.form.reset();
    this.form.patchValue({ holder: this.accounts()[0]?.holder ?? '' });
    this.formOpen.set(true);
  }

  protected edit(account: BankAccount): void {
    this.editingId.set(account.id);
    this.form.setValue({
      bank: account.bank,
      branch: account.branch ?? '',
      accountNumber: account.accountNumber ?? '',
      accountType: account.accountType ?? '',
      pixKey: account.pixKey ?? '',
      holder: account.holder ?? '',
      defaultAccount: account.defaultAccount,
    });
    this.formOpen.set(true);
  }

  protected cancel(): void {
    this.formOpen.set(false);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const text = (value: string) => (value.trim() === '' ? null : value.trim());
    const request: BankAccountRequest = {
      bank: v.bank.trim(),
      branch: text(v.branch),
      accountNumber: text(v.accountNumber),
      accountType: text(v.accountType),
      pixKey: text(v.pixKey),
      holder: text(v.holder),
      defaultAccount: v.defaultAccount,
    };
    this.saving.set(true);
    this.service.saveBankAccount(this.editingId(), request).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.load();
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }

  protected makeDefault(account: BankAccount): void {
    const { id, ...request } = account;
    this.service.saveBankAccount(id, { ...request, defaultAccount: true }).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected remove(account: BankAccount): void {
    if (!confirm(`Remover a conta ${account.bank}? Orçamentos antigos continuam mostrando essa conta.`)) return;
    this.service.deactivateBankAccount(account.id).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.listBankAccounts().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
