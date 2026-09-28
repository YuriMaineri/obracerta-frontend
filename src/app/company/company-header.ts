import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-company-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <h1>Empresa</h1>
    <nav>
      <a routerLink="/company/details" routerLinkActive="active">Dados e logotipo</a>
      <a routerLink="/company/bank-accounts" routerLinkActive="active">Contas bancárias</a>
      <a routerLink="/company/clauses" routerLinkActive="active">Cláusulas</a>
    </nav>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 28px 32px 0;
      border-bottom: 1px solid var(--color-divider);
      flex: none;
    }
    nav { display: flex; gap: 28px; }
    a {
      font-size: 14px;
      padding-bottom: 12px;
      margin-bottom: -1px;
      color: var(--color-neutral-700);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      &:hover { color: var(--color-text); }
      &.active { color: var(--color-text); font-weight: 500; border-bottom-color: var(--color-accent); }
    }
  `,
})
export class CompanyHeader {}
