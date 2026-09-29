import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, startWith, switchMap, tap } from 'rxjs';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { errorMessage } from '../shared/http-error';
import { Icon } from '../shared/icon';
import {
  EstimateStatus,
  EstimateSummary,
  STATUS_LABELS,
  formatDate,
  formatLeadTime,
  formatMoney,
} from './estimate.model';
import { EstimateService } from './estimate.service';

type StatusFilter = 'ALL' | EstimateStatus;

@Component({
  selector: 'app-estimate-list',
  imports: [BlueprintDirective, Icon, RouterLink],
  templateUrl: './estimate-list.html',
  styleUrl: './estimate-list.scss',
})
export class EstimateList {
  private readonly service = inject(EstimateService);
  private readonly router = inject(Router);

  protected readonly estimates = signal<EstimateSummary[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly statusFilter = signal<StatusFilter>('ALL');
  protected readonly selectedId = signal<number | null>(null);
  protected readonly selected = computed(
    () => this.estimates().find((e) => e.id === this.selectedId()) ?? this.estimates()[0] ?? null,
  );

  protected readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Todos' },
    ...(Object.keys(STATUS_LABELS) as EstimateStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
  ];
  protected readonly statusLabel = STATUS_LABELS;
  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly formatLeadTime = formatLeadTime;

  private query = '';
  private readonly reload$ = new Subject<void>();
  private readonly typing$ = new Subject<string>();

  constructor() {
    this.typing$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
      this.query = term;
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
          const status = this.statusFilter();
          return this.service.search({ query: this.query, status: status === 'ALL' ? null : status }).pipe(
            catchError((e) => {
              this.error.set(errorMessage(e));
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((page) => {
        this.estimates.set(page.content);
        this.totalElements.set(page.page.totalElements);
        this.loading.set(false);
        if (!page.content.some((e) => e.id === this.selectedId())) this.selectedId.set(page.content[0]?.id ?? null);
      });
  }

  protected onSearch(term: string): void {
    this.typing$.next(term.trim());
  }

  protected setStatusFilter(status: StatusFilter): void {
    if (this.statusFilter() === status) return;
    this.statusFilter.set(status);
    this.reload$.next();
  }

  protected select(estimate: EstimateSummary): void {
    this.selectedId.set(estimate.id);
  }

  protected open(estimate: EstimateSummary): void {
    this.router.navigate(['/estimates', estimate.id]);
  }

  protected openProposal(estimate: EstimateSummary): void {
    window.open(this.service.proposalUrl(estimate.id), '_blank');
  }

  protected proposalDownloadUrl(estimate: EstimateSummary): string {
    return this.service.proposalUrl(estimate.id, true);
  }

  protected duplicate(estimate: EstimateSummary): void {
    this.service.duplicate(estimate.id).subscribe({
      next: (copy) => this.router.navigate(['/estimates', copy.id]),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected remove(estimate: EstimateSummary): void {
    if (!confirm(`Excluir o rascunho ${estimate.number}? Não dá para desfazer.`)) return;
    this.service.delete(estimate.id).subscribe({
      next: () => this.reload$.next(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected totalLabel(): string {
    const n = this.totalElements();
    return `${n} ${n === 1 ? 'orçamento' : 'orçamentos'}`;
  }
}
