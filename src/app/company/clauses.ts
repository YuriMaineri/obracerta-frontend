import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { fieldErrorMessage } from '../shared/form-errors';
import { errorMessage } from '../shared/http-error';
import { Icon } from '../shared/icon';
import { notBlankValidator } from '../shared/validators';
import { CompanyHeader } from './company-header';
import { CLAUSE_SECTIONS, Clause, ClauseRequest, ClauseType, groupClauses } from './company.model';
import { CompanyService } from './company.service';

@Component({
  selector: 'app-clauses',
  imports: [ReactiveFormsModule, BlueprintDirective, Icon, CompanyHeader],
  templateUrl: './clauses.html',
  styleUrl: './clauses.scss',
})
export class Clauses implements OnInit {
  private readonly service = inject(CompanyService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  protected readonly sectionOptions = CLAUSE_SECTIONS;
  protected readonly clauses = signal<Clause[]>([]);
  protected readonly sections = computed(() => groupClauses(this.clauses()));
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly creating = signal(false);
  protected readonly activeSection = signal<ClauseType>('PAYMENT');
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);

  protected readonly form = this.fb.group({
    type: this.fb.control<ClauseType>('OBSERVATION', Validators.required),
    title: ['', [Validators.required, notBlankValidator, Validators.maxLength(150)]],
    content: ['', [Validators.required, notBlankValidator, Validators.maxLength(2000)]],
    defaultClause: [false],
    sortOrder: [0, Validators.min(0)],
  });

  private readonly values = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly heading = computed(() => {
    const title = this.values().title?.trim();
    return title || (this.creating() ? 'Nova cláusula' : 'Cláusula');
  });

  protected readonly sectionLabel = computed(() => {
    const v = this.values();
    const label = CLAUSE_SECTIONS.find((s) => s.type === v.type)?.label ?? '';
    return v.defaultClause ? `${label} · já vem marcada` : label;
  });

  protected readonly fieldError = (name: keyof typeof this.form.controls) =>
    fieldErrorMessage(this.form.controls[name]);

  ngOnInit(): void {
    this.load();
  }

  protected select(clause: Clause): void {
    this.creating.set(false);
    this.saved.set(false);
    this.selectedId.set(clause.id);
    this.form.reset({
      type: clause.type,
      title: clause.title,
      content: clause.content,
      defaultClause: clause.defaultClause,
      sortOrder: clause.sortOrder,
    });
  }

  protected startNew(type: ClauseType): void {
    const count = this.clauses().filter((c) => c.type === type).length;
    this.creating.set(true);
    this.saved.set(false);
    this.selectedId.set(null);
    this.activeSection.set(type);
    this.form.reset({ type, title: '', content: '', defaultClause: false, sortOrder: count + 1 });
  }

  private jumpUntil = 0;

  protected jumpTo(type: ClauseType): void {
    this.activeSection.set(type);
    this.jumpUntil = Date.now() + 800;
    const container = this.list().nativeElement;
    const target = container.querySelector<HTMLElement>(`[data-section="${type}"]`);
    if (target) container.scrollTo({ top: target.offsetTop - container.offsetTop - 24, behavior: 'smooth' });
  }

  protected onListScroll(): void {
    if (Date.now() < this.jumpUntil) return;
    const container = this.list().nativeElement;
    let current: ClauseType = 'PAYMENT';
    for (const el of Array.from(container.querySelectorAll<HTMLElement>('[data-section]'))) {
      if (el.offsetTop - container.offsetTop - container.scrollTop <= 48) current = el.dataset['section'] as ClauseType;
    }
    this.activeSection.set(current);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const request: ClauseRequest = { ...v, title: v.title.trim(), content: v.content.trim() };
    this.saving.set(true);
    this.error.set(null);
    this.service.saveClause(this.creating() ? null : this.selectedId(), request).subscribe({
      next: (clause) => {
        this.saving.set(false);
        this.saved.set(true);
        this.load(clause.id);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }

  protected remove(): void {
    const clause = this.clauses().find((c) => c.id === this.selectedId());
    if (!clause || !confirm(`Remover a cláusula "${clause.title}"?`)) return;
    this.service.deactivateClause(clause.id).subscribe({
      next: () => {
        this.selectedId.set(null);
        this.load();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private load(selectId?: number): void {
    this.loading.set(true);
    this.service.listClauses().subscribe({
      next: (clauses) => {
        this.clauses.set(clauses);
        this.loading.set(false);
        const wanted = clauses.find((c) => c.id === (selectId ?? this.selectedId()));
        const first = groupClauses(clauses).flatMap((s) => s.items)[0];
        const target = wanted ?? (this.creating() ? undefined : first);
        if (target) {
          const keepSaved = this.saved();
          this.select(target);
          this.saved.set(keepSaved);
        }
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
