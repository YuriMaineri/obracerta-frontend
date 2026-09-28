import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, tap, catchError, EMPTY, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { formatPhone } from '../shared/br-formats';
import { Customer, formatTaxId } from './customer.model';
import { errorMessage } from '../shared/http-error';
import { CustomerService } from './customer.service';

@Component({
  selector: 'app-customer-list',
  imports: [RouterLink],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
})
export class CustomerList {
  private readonly service = inject(CustomerService);

  protected readonly customers = signal<Customer[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly formatTaxId = formatTaxId;
  protected readonly formatPhone = formatPhone;

  private query = '';
  private readonly reload$ = new Subject<void>();
  private readonly typing$ = new Subject<string>();

  constructor() {
    this.typing$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.query = term;
        this.page.set(0);
        this.reload$.next();
      });

    this.reload$
      .pipe(
        startWith(undefined),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.service.search(this.query, this.page()).pipe(
            catchError((e) => {
              this.error.set(errorMessage(e));
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.customers.set(result.content);
        this.totalElements.set(result.page.totalElements);
        this.totalPages.set(result.page.totalPages);
        this.loading.set(false);
      });
  }

  protected onSearch(term: string): void {
    this.typing$.next(term.trim());
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.reload$.next();
  }

  protected deactivate(customer: Customer): void {
    if (!confirm(`Inativar ${customer.name}? Ele deixa de aparecer na lista, mas os orçamentos continuam.`)) return;
    this.service.deactivate(customer.id).subscribe({
      next: () => this.reload$.next(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
