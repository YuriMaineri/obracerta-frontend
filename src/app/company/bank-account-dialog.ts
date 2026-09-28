import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { Dialog } from '../shared/dialog';
import { fieldErrorMessage } from '../shared/form-errors';
import { errorMessage } from '../shared/http-error';
import { notBlankValidator } from '../shared/validators';
import { BankAccount, BankAccountRequest } from './company.model';
import { CompanyService } from './company.service';

@Component({
  selector: 'app-bank-account-dialog',
  imports: [ReactiveFormsModule, Dialog, BlueprintDirective],
  template: `
    <app-dialog [title]="account() ? 'Editar conta' : 'Nova conta'" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="dialog-form">
        <div class="dialog-body">
          @if (error(); as message) {
            <div class="alert-error" role="alert">{{ message }}</div>
          }
          <div class="form-grid">
            <div class="field">
              <label for="b-bank">Banco *</label>
              <input id="b-bank" formControlName="bank" placeholder="Ex.: Banrisul" />
              @if (fieldError('bank'); as msg) { <small class="field-error">{{ msg }}</small> }
            </div>
            <div class="field">
              <label for="b-type">Tipo de conta</label>
              <input id="b-type" formControlName="accountType" />
            </div>
            <div class="field">
              <label for="b-branch">Agência</label>
              <input id="b-branch" formControlName="branch" inputmode="numeric" />
            </div>
            <div class="field">
              <label for="b-number">Conta</label>
              <input id="b-number" formControlName="accountNumber" inputmode="numeric" />
            </div>
            <div class="field wide">
              <label for="b-pix">Chave PIX</label>
              <input id="b-pix" formControlName="pixKey" placeholder="CNPJ, e-mail, telefone ou chave aleatória" />
            </div>
            <div class="field wide">
              <label for="b-holder">Titular</label>
              <input id="b-holder" formControlName="holder" />
            </div>
          </div>
          <label class="checkbox"><input type="checkbox" formControlName="defaultAccount" /> Conta padrão dos orçamentos</label>
        </div>
        <div class="dialog-footer">
          <button type="button" class="btn btn-secondary" (click)="closed.emit()">Cancelar</button>
          <button type="submit" class="btn btn-primary" appBlueprint [disabled]="saving()">
            {{ saving() ? 'Salvando…' : 'Salvar conta' }}
          </button>
        </div>
      </form>
    </app-dialog>
  `,
})
export class BankAccountDialog implements OnInit {
  private readonly service = inject(CompanyService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly account = input<BankAccount | null>(null);
  readonly defaultHolder = input<string | null>(null);
  readonly saved = output<BankAccount>();
  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

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
    const a = this.account();
    if (!a) {
      this.form.patchValue({ holder: this.defaultHolder() ?? '' });
      return;
    }
    this.form.setValue({
      bank: a.bank,
      branch: a.branch ?? '',
      accountNumber: a.accountNumber ?? '',
      accountType: a.accountType ?? '',
      pixKey: a.pixKey ?? '',
      holder: a.holder ?? '',
      defaultAccount: a.defaultAccount,
    });
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
    this.error.set(null);
    this.service.saveBankAccount(this.account()?.id ?? null, request).subscribe({
      next: (account) => this.saved.emit(account),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }
}
