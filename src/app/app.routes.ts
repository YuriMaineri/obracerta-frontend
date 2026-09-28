import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'customers' },
  {
    path: 'customers',
    title: 'Clientes · ObraCerta',
    loadComponent: () => import('./customers/customer-list').then((m) => m.CustomerList),
  },
  {
    path: 'estimates',
    title: 'Orçamentos · ObraCerta',
    loadComponent: () => import('./estimates/estimate-list').then((m) => m.EstimateList),
  },
  {
    path: 'estimates/new',
    title: 'Novo orçamento · ObraCerta',
    loadComponent: () => import('./estimates/estimate-editor').then((m) => m.EstimateEditor),
  },
  {
    path: 'estimates/:id',
    title: 'Orçamento · ObraCerta',
    loadComponent: () => import('./estimates/estimate-editor').then((m) => m.EstimateEditor),
  },
  {
    path: 'company',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'details' },
      {
        path: 'details',
        title: 'Empresa · ObraCerta',
        loadComponent: () => import('./company/company-details').then((m) => m.CompanyDetails),
      },
      {
        path: 'bank-accounts',
        title: 'Contas bancárias · ObraCerta',
        loadComponent: () => import('./company/bank-accounts').then((m) => m.BankAccounts),
      },
      {
        path: 'clauses',
        title: 'Cláusulas · ObraCerta',
        loadComponent: () => import('./company/clauses').then((m) => m.Clauses),
      },
    ],
  },
  { path: '**', redirectTo: 'customers' },
];
