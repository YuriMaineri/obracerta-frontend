import { Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { Dialog } from '../shared/dialog';
import { errorMessage } from '../shared/http-error';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-password-dialog',
  imports: [ReactiveFormsModule, Dialog, BlueprintDirective],
  template: `
    <app-dialog title="Trocar senha" [width]="440" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="dialog-form">
        <div class="dialog-body">
          @if (error(); as message) {
            <div class="alert-error" role="alert">{{ message }}</div>
          }
          @if (done()) {
            <div class="notice">Senha alterada.</div>
          }
          <div class="field">
            <label for="pw-current">Senha atual</label>
            <input id="pw-current" type="password" formControlName="currentPassword" autocomplete="current-password" />
          </div>
          <div class="field">
            <label for="pw-new">Nova senha (mínimo 8 caracteres)</label>
            <input id="pw-new" type="password" formControlName="newPassword" autocomplete="new-password" />
          </div>
          <div class="field">
            <label for="pw-confirm">Repita a nova senha</label>
            <input id="pw-confirm" type="password" formControlName="confirm" autocomplete="new-password" />
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="btn btn-secondary" (click)="closed.emit()">{{ done() ? 'Fechar' : 'Cancelar' }}</button>
          @if (!done()) {
            <button type="submit" class="btn btn-primary" appBlueprint [disabled]="saving()">{{ saving() ? 'Salvando…' : 'Trocar senha' }}</button>
          }
        </div>
      </form>
    </app-dialog>
  `,
})
export class PasswordDialog {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required],
  });

  protected save(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid) {
      this.error.set(this.form.controls.newPassword.hasError('minlength') ? 'A nova senha precisa ter pelo menos 8 caracteres.' : 'Preencha os três campos.');
      return;
    }
    if (v.newPassword !== v.confirm) {
      this.error.set('A confirmação não bate com a nova senha.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.auth.changePassword(v.currentPassword, v.newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.done.set(true);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }
}
