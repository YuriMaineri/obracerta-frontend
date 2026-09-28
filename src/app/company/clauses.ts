import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fieldErrorMessage } from '../shared/form-errors';
import { errorMessage } from '../shared/http-error';
import { notBlankValidator } from '../shared/validators';
import { CLAUSE_SECTIONS, Clause, ClauseRequest, ClauseType, groupClauses } from './company.model';
import { CompanyService } from './company.service';

@Component({
  selector: 'app-clauses',
  imports: [ReactiveFormsModule],
  templateUrl: './clauses.html',
  styleUrl: './company-lists.scss',
})
export class Clauses implements OnInit {
  private readonly service = inject(CompanyService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly sectionOptions = CLAUSE_SECTIONS;
  protected readonly clauses = signal<Clause[]>([]);
  protected readonly sections = computed(() => groupClauses(this.clauses()));
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly formOpenFor = signal<ClauseType | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    type: this.fb.control<ClauseType>('OBSERVATION', Validators.required),
    title: ['', [Validators.required, notBlankValidator, Validators.maxLength(150)]],
    content: ['', [Validators.required, notBlankValidator, Validators.maxLength(2000)]],
    defaultClause: [false],
    sortOrder: [0, Validators.min(0)],
  });

  protected readonly fieldError = (name: keyof typeof this.form.controls) =>
    fieldErrorMessage(this.form.controls[name]);

  ngOnInit(): void {
    this.load();
  }

  protected openNew(type: ClauseType): void {
    const last = this.clauses().filter((c) => c.type === type).reduce((max, c) => Math.max(max, c.sortOrder), 0);
    this.editingId.set(null);
    this.form.reset({ type, title: '', content: '', defaultClause: false, sortOrder: last + 1 });
    this.formOpenFor.set(type);
  }

  protected edit(clause: Clause): void {
    this.editingId.set(clause.id);
    this.form.setValue({
      type: clause.type,
      title: clause.title,
      content: clause.content,
      defaultClause: clause.defaultClause,
      sortOrder: clause.sortOrder,
    });
    this.formOpenFor.set(clause.type);
  }

  protected cancel(): void {
    this.formOpenFor.set(null);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const request: ClauseRequest = { ...v, title: v.title.trim(), content: v.content.trim() };
    this.saving.set(true);
    this.service.saveClause(this.editingId(), request).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpenFor.set(null);
        this.load();
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }

  protected remove(clause: Clause): void {
    if (!confirm(`Remover a cláusula "${clause.title}"?`)) return;
    this.service.deactivateClause(clause.id).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.listClauses().subscribe({
      next: (clauses) => {
        this.clauses.set(clauses);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
