import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-company-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <h1>Empresa</h1>
    <nav class="tabs">
      <a routerLink="details" routerLinkActive="active">Dados e logotipo</a>
      <a routerLink="bank-accounts" routerLinkActive="active">Contas bancárias</a>
      <a routerLink="clauses" routerLinkActive="active">Cláusulas</a>
    </nav>
    <router-outlet />
  `,
  styles: `
    h1 { margin-bottom: 1rem; }
    .tabs {
      display: flex;
      gap: 1.5rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 1.5rem;
      a {
        padding: 0.5rem 0;
        color: var(--color-muted);
        text-decoration: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        &.active, &:hover { color: var(--color-text); border-bottom-color: var(--color-accent); }
      }
    }
  `,
})
export class CompanyPage {}
