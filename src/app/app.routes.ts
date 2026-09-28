import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'customers' },
  {
    path: 'customers',
    title: 'Clientes · ObraCerta',
    loadComponent: () => import('./customers/customer-list').then((m) => m.CustomerList),
  },
  {
    path: 'customers/new',
    title: 'Novo cliente · ObraCerta',
    loadComponent: () => import('./customers/customer-form').then((m) => m.CustomerForm),
  },
  {
    path: 'customers/:id',
    title: 'Editar cliente · ObraCerta',
    loadComponent: () => import('./customers/customer-form').then((m) => m.CustomerForm),
  },
  {
    path: 'company',
    title: 'Empresa · ObraCerta',
    loadComponent: () => import('./company/company-page').then((m) => m.CompanyPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'details' },
      { path: 'details', loadComponent: () => import('./company/company-details').then((m) => m.CompanyDetails) },
      { path: 'bank-accounts', loadComponent: () => import('./company/bank-accounts').then((m) => m.BankAccounts) },
      { path: 'clauses', loadComponent: () => import('./company/clauses').then((m) => m.Clauses) },
    ],
  },
  { path: '**', redirectTo: 'customers' },
];
