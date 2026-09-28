import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, startWith, switchMap, tap } from 'rxjs';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { formatPhone, formatPostalCode } from '../shared/br-formats';
import { errorMessage } from '../shared/http-error';
import { Icon } from '../shared/icon';
import { Customer, PersonType, formatTaxId } from './customer.model';
import { CustomerDialog } from './customer-dialog';
import { CustomerService } from './customer.service';
import { EstimateSummary, STATUS_LABELS, formatDate, formatMoney } from '../estimates/estimate.model';
import { EstimateService } from '../estimates/estimate.service';

type TypeFilter = 'ALL' | PersonType;

@Component({
  selector: 'app-customer-list',
  imports: [BlueprintDirective, Icon, CustomerDialog, RouterLink],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
})
export class CustomerList {
  private readonly service = inject(CustomerService);
  private readonly estimateService = inject(EstimateService);
  private readonly router = inject(Router);

  protected readonly history = signal<EstimateSummary[]>([]);
  protected readonly historyTotal = signal(0);
  protected readonly statusLabel = STATUS_LABELS;
  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;

  protected readonly customers = signal<Customer[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly typeFilter = signal<TypeFilter>('ALL');
  protected readonly selectedId = signal<number | null>(null);
  protected readonly dialog = signal<{ customer: Customer | null } | null>(null);

  protected readonly selected = computed(
    () => this.customers().find((c) => c.id === this.selectedId()) ?? this.customers()[0] ?? null,
  );

  protected readonly formatTaxId = formatTaxId;
  protected readonly formatPhone = formatPhone;
  protected readonly formatPostalCode = formatPostalCode;

  private query = '';
  private keepSelection: number | null = null;
  private readonly reload$ = new Subject<void>();
  private readonly typing$ = new Subject<string>();

  constructor() {
    effect((onCleanup) => {
      const id = this.selected()?.id;
      this.history.set([]);
      this.historyTotal.set(0);
      if (!id) return;
      const sub = this.estimateService.search({ customerId: id }, 0, 5).subscribe({
        next: (page) => {
          this.history.set(page.content);
          this.historyTotal.set(page.page.totalElements);
        },
      });
      onCleanup(() => sub.unsubscribe());
    });

    this.typing$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
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
        switchMap(() => {
          const type = this.typeFilter();
          return this.service.search(this.query, type === 'ALL' ? null : type, this.page()).pipe(
            catchError((e) => {
              this.error.set(errorMessage(e));
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.customers.set(result.content);
        this.totalElements.set(result.page.totalElements);
        this.totalPages.set(result.page.totalPages);
        this.loading.set(false);
        const keep = this.keepSelection;
        this.keepSelection = null;
        const stillThere = result.content.some((c) => c.id === (keep ?? this.selectedId()));
        this.selectedId.set(stillThere ? (keep ?? this.selectedId()) : (result.content[0]?.id ?? null));
      });
  }

  protected totalLabel(): string {
    const n = this.totalElements();
    return `${n} ${n === 1 ? 'cliente ativo' : 'clientes ativos'}`;
  }

  protected onSearch(term: string): void {
    this.typing$.next(term.trim());
  }

  protected setTypeFilter(type: TypeFilter): void {
    if (this.typeFilter() === type) return;
    this.typeFilter.set(type);
    this.page.set(0);
    this.reload$.next();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.reload$.next();
  }

  protected select(customer: Customer): void {
    this.selectedId.set(customer.id);
  }

  protected openCreate(): void {
    this.dialog.set({ customer: null });
  }

  protected openEdit(customer: Customer): void {
    this.dialog.set({ customer });
  }

  protected onSaved(customer: Customer): void {
    this.dialog.set(null);
    this.keepSelection = customer.id;
    this.reload$.next();
  }

  protected deactivate(customer: Customer): void {
    if (!confirm(`Inativar ${customer.name}? Ele deixa de aparecer na lista, mas os orçamentos continuam.`)) return;
    this.service.deactivate(customer.id).subscribe({
      next: () => this.reload$.next(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected newEstimate(customer: Customer): void {
    this.router.navigate(['/estimates/new'], { queryParams: { customerId: customer.id } });
  }

  protected personLabel(c: Customer): string {
    return c.personType === 'COMPANY' ? 'PJ' : 'PF';
  }

  protected addressLine(c: Customer): string {
    const cep = c.postalCode ? `CEP ${formatPostalCode(c.postalCode)}` : null;
    return [c.district, c.city, cep].filter(Boolean).join(' · ');
  }
}
