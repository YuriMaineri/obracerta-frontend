import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { PasswordDialog } from './auth/password-dialog';
import { CompanyService } from './company/company.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PasswordDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly companyService = inject(CompanyService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly companyName = this.companyService.displayName;
  protected readonly user = this.auth.user;
  protected readonly passwordDialog = signal(false);

  constructor() {
    effect(() => {
      if (this.user()) this.companyService.refreshDisplayName();
    });
  }

  protected logout(): void {
    this.auth.logout().subscribe({ complete: () => this.router.navigate(['/login']), error: () => this.router.navigate(['/login']) });
  }
}
