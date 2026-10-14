import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { errorMessage } from '../shared/http-error';
import { Icon } from '../shared/icon';
import { formatDate, formatMoney } from '../estimates/estimate.model';
import { CatalogHeader } from './catalog-header';
import { Material, MaterialPrice, UNIT_SYMBOLS } from './catalog.model';
import { CatalogApi } from './catalog.service';
import { MaterialDialog } from './material-dialog';

@Component({
  selector: 'app-material-list',
  imports: [BlueprintDirective, Icon, CatalogHeader, MaterialDialog],
  templateUrl: './material-list.html',
  styleUrl: './catalog.scss',
})
export class MaterialList {
  private readonly api = inject(CatalogApi);

  protected readonly materials = signal<Material[]>([]);
  protected readonly prices = signal<MaterialPrice[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly dialog = signal<{ material: Material | null } | null>(null);

  protected readonly selected = computed(
    () => this.materials().find((m) => m.id === this.selectedId()) ?? this.materials()[0] ?? null,
  );

  protected readonly unit = UNIT_SYMBOLS;
  protected readonly formatMoney = formatMoney;
  protected readonly formatDate = formatDate;

  private query = '';
  private readonly typing$ = new Subject<string>();

  constructor() {
    this.typing$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
      this.query = term;
      this.load();
    });

    effect((onCleanup) => {
      const id = this.selected()?.id;
      this.prices.set([]);
      if (!id) return;
      const sub = this.api.materialPrices(id).subscribe({ next: (p) => this.prices.set(p) });
      onCleanup(() => sub.unsubscribe());
    });

    this.load();
  }

  protected onSearch(term: string): void {
    this.typing$.next(term.trim());
  }

  protected select(material: Material): void {
    this.selectedId.set(material.id);
  }

  protected openCreate(): void {
    this.dialog.set({ material: null });
  }

  protected openEdit(material: Material): void {
    this.dialog.set({ material });
  }

  protected onSaved(material: Material): void {
    this.dialog.set(null);
    this.load(material.id);
  }

  protected remove(material: Material): void {
    if (!confirm(`Remover o insumo "${material.name}" do catálogo?`)) return;
    this.api.deactivateMaterial(material.id).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private load(keep: number | null = null): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listMaterials(this.query).subscribe({
      next: (list) => {
        this.materials.set(list);
        this.loading.set(false);
        const wanted = keep ?? this.selectedId();
        this.selectedId.set(list.some((m) => m.id === wanted) ? wanted : (list[0]?.id ?? null));
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
