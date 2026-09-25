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
  { path: '**', redirectTo: 'customers' },
];
