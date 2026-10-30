import { Component, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { errorMessage } from '../shared/http-error';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, BlueprintDirective],
  template: `
    <div class="screen">
      <form class="card" appBlueprint [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="head">
          <span class="brand">ObraCerta</span>
          <span class="muted">Orçamentos da Maineri Elétrica, Construções e Reformas</span>
        </div>
        @if (expired()) {
          <div class="notice">Sua sessão expirou. Entre de novo para continuar.</div>
        }
        @if (error(); as message) {
          <div class="alert-error" role="alert">{{ message }}</div>
        }
        <div class="field">
          <label for="l-email">E-mail</label>
          <input id="l-email" type="email" formControlName="email" autocomplete="username" autofocus />
        </div>
        <div class="field">
          <label for="l-password">Senha</label>
          <input id="l-password" type="password" formControlName="password" autocomplete="current-password" />
        </div>
        <button type="submit" class="btn btn-primary btn-block" appBlueprint [disabled]="sending()">
          {{ sending() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </div>
  `,
  styles: `
    .screen { min-height: 100vh; display: grid; place-items: center; padding: 16px; background: var(--color-accent-900); }
    .card { width: 380px; max-width: 100%; display: flex; flex-direction: column; gap: 16px; padding: 32px; background: var(--color-bg); }
    .head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
    .brand { font-family: var(--font-heading); font-weight: 600; font-size: 34px; line-height: 1; }
    .muted { font-size: 13px; }
    .btn { flex: none; height: 42px; margin-top: 8px; }
  `,
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly returnUrl = input<string>();
  readonly expired = input<string>();

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    if (this.auth.user()) this.router.navigateByUrl(this.returnUrl() || '/');
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.error.set('Informe o e-mail e a senha.');
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.sending.set(true);
    this.error.set(null);
    this.auth.login(email.trim(), password).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl() || '/'),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.sending.set(false);
        this.form.controls.password.reset();
      },
    });
  }
}
