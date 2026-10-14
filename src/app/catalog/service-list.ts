import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { errorMessage } from '../shared/http-error';
import { Icon } from '../shared/icon';
import { formatMoney } from '../estimates/estimate.model';
import { CatalogHeader } from './catalog-header';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PRICING_MODE_LABELS,
  ServiceCategory,
  ServiceItem,
  UNIT_SYMBOLS,
  formatQuantity,
  productivityLabel,
} from './catalog.model';
import { CatalogApi } from './catalog.service';
import { ServiceDialog } from './service-dialog';

@Component({
  selector: 'app-service-list',
  imports: [BlueprintDirective, Icon, CatalogHeader, ServiceDialog],
  templateUrl: './service-list.html',
  styleUrl: './catalog.scss',
})
export class ServiceList {
  private readonly api = inject(CatalogApi);

  protected readonly services = signal<ServiceItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly category = signal<ServiceCategory | null>(null);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly dialog = signal<{ service: ServiceItem | null } | null>(null);

  protected readonly selected = computed(
    () => this.services().find((s) => s.id === this.selectedId()) ?? this.services()[0] ?? null,
  );

  protected readonly categories = CATEGORIES;
  protected readonly categoryLabel = CATEGORY_LABELS;
  protected readonly modeLabel = PRICING_MODE_LABELS;
  protected readonly unit = UNIT_SYMBOLS;
  protected readonly formatMoney = formatMoney;
  protected readonly formatQuantity = formatQuantity;
  protected readonly productivityLabel = productivityLabel;

  private query = '';
  private readonly typing$ = new Subject<string>();

  constructor() {
    this.typing$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
      this.query = term;
      this.load();
    });
    this.load();
  }

  protected onSearch(term: string): void {
    this.typing$.next(term.trim());
  }

  protected setCategory(value: string): void {
    this.category.set(value ? (value as ServiceCategory) : null);
    this.load();
  }

  protected select(service: ServiceItem): void {
    this.selectedId.set(service.id);
  }

  protected openCreate(): void {
    this.dialog.set({ service: null });
  }

  protected openEdit(service: ServiceItem): void {
    this.dialog.set({ service });
  }

  protected onSaved(service: ServiceItem): void {
    this.dialog.set(null);
    this.load(service.id);
  }

  protected remove(service: ServiceItem): void {
    if (!confirm(`Remover o serviço "${service.name}" do catálogo?`)) return;
    this.api.deactivateService(service.id).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected waste(value: number): string {
    return value ? ` + ${formatQuantity(value)}% de perda` : '';
  }

  private load(keep: number | null = null): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listServices(this.query, this.category()).subscribe({
      next: (list) => {
        this.services.set(list);
        this.loading.set(false);
        const wanted = keep ?? this.selectedId();
        this.selectedId.set(list.some((s) => s.id === wanted) ? wanted : (list[0]?.id ?? null));
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
