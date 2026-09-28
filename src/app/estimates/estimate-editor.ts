import { Component, ElementRef, Injector, OnInit, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, startWith } from 'rxjs';
import { BankAccount, CLAUSE_SECTIONS, Clause, ClauseType } from '../company/company.model';
import { CompanyService } from '../company/company.service';
import { Customer } from '../customers/customer.model';
import { CustomerService } from '../customers/customer.service';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { errorMessage } from '../shared/http-error';
import { Icon } from '../shared/icon';
import {
  EstimateDetails,
  EstimateRequest,
  EstimateStatus,
  MATERIAL_SUPPLY_OPTIONS,
  MaterialSupply,
  STATUS_LABELS,
  formatLeadTime,
  formatMoney,
  sumMaterials,
} from './estimate.model';
import { EstimateService } from './estimate.service';

@Component({
  selector: 'app-estimate-editor',
  imports: [ReactiveFormsModule, RouterLink, BlueprintDirective, Icon],
  templateUrl: './estimate-editor.html',
  styleUrl: './estimate-editor.scss',
})
export class EstimateEditor implements OnInit {
  private readonly service = inject(EstimateService);
  private readonly customerService = inject(CustomerService);
  private readonly companyService = inject(CompanyService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Rota /estimates/:id; ausente em /estimates/new. */
  readonly id = input<string>();
  /** Query param ?customerId= vindo da ficha do cliente. */
  readonly customerId = input<string>();

  protected readonly estimate = signal<EstimateDetails | null>(null);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly bankAccounts = signal<BankAccount[]>([]);
  protected readonly clauses = signal<Clause[]>([]);
  protected readonly selectedClauses = signal<Set<number>>(new Set());
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly savedAt = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly clausesDirty = signal(false);

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statuses = Object.keys(STATUS_LABELS) as EstimateStatus[];
  protected readonly supplyOptions = MATERIAL_SUPPLY_OPTIONS;
  protected readonly formatMoney = formatMoney;

  protected readonly form = this.fb.group({
    customerId: this.fb.control<number | null>(null, Validators.required),
    title: ['', Validators.maxLength(200)],
    issueDate: [today()],
    validityDays: this.fb.control<number | null>(null, Validators.min(0)),
    minLeadDays: this.fb.control<number | null>(null, Validators.min(0)),
    maxLeadDays: this.fb.control<number | null>(null, Validators.min(0)),
    materialSupply: this.fb.control<MaterialSupply>('ITEMIZED'),
    estimatedMaterialCost: this.fb.control<number | null>(null, Validators.min(0)),
    paymentTerms: [''],
    bankAccountId: this.fb.control<number | null>(null),
    services: this.fb.array<FormGroup>([]),
    materials: this.fb.array<FormGroup>([]),
    priceLines: this.fb.array<FormGroup>([]),
    exclusions: this.fb.array<string>([]),
    internalNotes: this.fb.array<string>([]),
  });

  protected readonly noteDraft = this.fb.control('');

  private readonly values = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly clauseSections = computed(() =>
    CLAUSE_SECTIONS.map((s) => ({
      ...s,
      items: this.clauses()
        .filter((c) => c.type === s.type)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    })),
  );

  protected readonly summary = computed(() => {
    const v = { ...this.form.getRawValue(), ...this.values() };
    const materials = (v.materials ?? []) as { totalPrice: number | null }[];
    const priced = materials.filter((m) => m.totalPrice != null);
    const supply = v.materialSupply as MaterialSupply;
    let material = 'Não informado';
    if (supply === 'CUSTOMER_SUPPLIED') material = 'Por conta do cliente';
    else if (supply === 'BY_RECEIPT') material = 'Comprado e apresentado por nota';
    else if (supply === 'ESTIMATED') material = v.estimatedMaterialCost != null ? `Aprox. ${formatMoney(v.estimatedMaterialCost)}` : 'Estimado, sem valor';
    else if (priced.length) material = formatMoney(sumMaterials(materials as never));
    const account = this.bankAccounts().find((a) => a.id === v.bankAccountId);
    const customer = this.customers().find((c) => c.id === v.customerId);
    return {
      customer: customer?.name ?? this.estimate()?.customer.name ?? 'Escolha o cliente',
      prices: ((v.priceLines ?? []) as { description: string; amount: number | null }[]).filter((p) => p.description?.trim()),
      material,
      leadTime: formatLeadTime(v.minLeadDays ?? null, v.maxLeadDays ?? null),
      account: account ? `${account.bank} · Ag. ${account.branch ?? '—'}` : 'Nenhuma',
      serviceNotes: ((v.services ?? []) as { description: string; internalNote: string }[])
        .filter((s) => s.internalNote?.trim())
        .map((s) => ({ service: clip(s.description?.trim() || 'Serviço sem descrição', 48), note: s.internalNote.trim() })),
    };
  });

  protected readonly materialTotal = computed(() => {
    const v = this.values();
    return sumMaterials(((v.materials ?? []) as { totalPrice: number | null }[]) as never);
  });

  get services(): FormArray<FormGroup> {
    return this.form.controls.services;
  }
  get materials(): FormArray<FormGroup> {
    return this.form.controls.materials;
  }
  get priceLines(): FormArray<FormGroup> {
    return this.form.controls.priceLines;
  }
  get exclusions() {
    return this.form.controls.exclusions;
  }
  get internalNotes() {
    return this.form.controls.internalNotes;
  }

  protected get isNew(): boolean {
    return !this.estimate();
  }

  protected get hasChanges(): boolean {
    return this.form.dirty || this.clausesDirty();
  }

  ngOnInit(): void {
    const id = this.id();
    forkJoin({
      customers: this.customerService.search('', null, 0, 100),
      accounts: this.companyService.listBankAccounts(),
      clauses: this.companyService.listClauses(),
    }).subscribe({
      next: ({ customers, accounts, clauses }) => {
        this.customers.set(customers.content);
        this.bankAccounts.set(accounts);
        this.clauses.set(clauses);
        if (id) {
          this.service.findById(Number(id)).subscribe({
            next: (e) => this.fill(e),
            error: (e) => this.fail(e),
          });
        } else {
          this.startNew(accounts, clauses);
        }
      },
      error: (e) => this.fail(e),
    });
  }

  protected addService(value = { description: '', internalNote: '' }): void {
    this.services.push(this.fb.group({ description: [value.description], internalNote: [value.internalNote ?? ''], showNote: [!!value.internalNote] }));
    this.form.markAsDirty();
  }

  protected addMaterial(value: { description: string; quantity: number | null; totalPrice: number | null } = { description: '', quantity: null, totalPrice: null }): void {
    this.materials.push(
      this.fb.group({
        description: [value.description, Validators.maxLength(200)],
        quantity: this.fb.control<number | null>(value.quantity, Validators.min(0)),
        totalPrice: this.fb.control<number | null>(value.totalPrice, Validators.min(0)),
      }),
    );
    this.form.markAsDirty();
  }

  protected addPriceLine(value: { description: string; amount: number | null } = { description: '', amount: null }): void {
    this.priceLines.push(
      this.fb.group({
        description: [value.description, Validators.maxLength(250)],
        amount: this.fb.control<number | null>(value.amount, Validators.min(0)),
      }),
    );
    this.form.markAsDirty();
  }

  protected addExclusion(value = ''): void {
    this.exclusions.push(this.fb.control(value));
    this.form.markAsDirty();
  }

  /** Foca o último campo da lista depois que a linha nova aparece na tela. */
  protected focusLast(selector: string): void {
    afterNextRender(
      () => {
        const fields = this.host.nativeElement.querySelectorAll<HTMLElement>(selector);
        fields[fields.length - 1]?.focus();
      },
      { injector: this.injector },
    );
  }

  protected remove(array: FormArray, index: number): void {
    array.removeAt(index);
    this.form.markAsDirty();
  }

  protected toggleNote(group: FormGroup): void {
    const show = !group.get('showNote')!.value;
    group.patchValue({ showNote: show });
    if (!show) group.patchValue({ internalNote: '' });
  }

  protected addInternalNote(): void {
    const text = this.noteDraft.value.trim();
    if (!text) return;
    this.internalNotes.push(this.fb.control(text));
    this.noteDraft.reset();
    this.form.markAsDirty();
  }

  protected isClauseSelected(clause: Clause): boolean {
    return this.selectedClauses().has(clause.id);
  }

  protected toggleClause(clause: Clause): void {
    const next = new Set(this.selectedClauses());
    if (next.has(clause.id)) next.delete(clause.id);
    else next.add(clause.id);
    this.selectedClauses.set(next);
    this.clausesDirty.set(true);
  }

  protected sectionFor(type: ClauseType) {
    return this.clauseSections().find((s) => s.type === type)!;
  }

  protected setSupply(value: MaterialSupply): void {
    this.form.controls.materialSupply.setValue(value);
    this.form.markAsDirty();
  }

  protected supplyHint(): string {
    return this.supplyOptions.find((o) => o.value === this.values().materialSupply)?.hint ?? '';
  }

  protected save(): void {
    this.dropEmptyRows();
    const missingAmount = this.priceLines.controls.find((g) => g.value.description?.trim() && g.value.amount == null);
    if (missingAmount) {
      missingAmount.get('amount')!.setErrors({ required: true });
      missingAmount.markAllAsTouched();
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise os campos destacados antes de salvar.');
      return;
    }
    const v = this.form.getRawValue();
    const text = (value: string | null | undefined) => (value && value.trim() ? value.trim() : null);
    const request: EstimateRequest = {
      customerId: v.customerId!,
      title: text(v.title),
      issueDate: v.issueDate || null,
      validityDays: v.validityDays,
      minLeadDays: v.minLeadDays,
      maxLeadDays: v.maxLeadDays,
      materialSupply: v.materialSupply,
      estimatedMaterialCost: v.materialSupply === 'ESTIMATED' ? v.estimatedMaterialCost : null,
      paymentTerms: text(v.paymentTerms),
      bankAccountId: v.bankAccountId,
      clauseIds: [...this.selectedClauses()],
      services: v.services.map((s) => ({ description: s['description'].trim(), internalNote: text(s['internalNote']) })),
      materials: v.materials.map((m) => ({ description: m['description'].trim(), quantity: m['quantity'], totalPrice: m['totalPrice'] })),
      priceLines: v.priceLines.map((p) => ({ description: p['description'].trim(), amount: p['amount'] })),
      exclusions: v.exclusions.map((x) => x.trim()),
      internalNotes: v.internalNotes.map((x) => x.trim()),
    };

    this.saving.set(true);
    this.error.set(null);
    const current = this.estimate();
    this.service.save(current?.id ?? null, request).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.savedAt.set(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        this.fill(saved);
        if (!current) this.router.navigate(['/estimates', saved.id], { replaceUrl: true });
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }

  protected changeStatus(status: EstimateStatus): void {
    const current = this.estimate();
    if (!current || current.status === status) return;
    this.service.changeStatus(current.id, status).subscribe({
      next: (e) => this.estimate.set(e),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected duplicate(): void {
    const current = this.estimate();
    if (!current) return;
    if (this.hasChanges && !confirm('Há alterações não salvas. Duplicar a última versão salva mesmo assim?')) return;
    this.service.duplicate(current.id).subscribe({
      next: (copy) => {
        this.fill(copy);
        this.router.navigate(['/estimates', copy.id], { replaceUrl: true });
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private startNew(accounts: BankAccount[], clauses: Clause[]): void {
    const customerId = Number(this.customerId()) || null;
    this.form.patchValue({
      customerId,
      bankAccountId: accounts.find((a) => a.defaultAccount)?.id ?? null,
    });
    this.selectedClauses.set(new Set(clauses.filter((c) => c.defaultClause).map((c) => c.id)));
    this.addService();
    this.addPriceLine({ description: 'Valor da mão de obra', amount: null });
    this.form.markAsPristine();
    this.loading.set(false);
  }

  private fill(e: EstimateDetails): void {
    this.estimate.set(e);
    if (!this.customers().some((c) => c.id === e.customer.id)) {
      this.customers.update((list) => [...list, { ...e.customer, personType: e.customer.personType as Customer['personType'], phone: null, email: null, postalCode: null }]);
    }
    this.services.clear();
    this.materials.clear();
    this.priceLines.clear();
    this.exclusions.clear();
    this.internalNotes.clear();
    this.form.patchValue({
      customerId: e.customer.id,
      title: e.title ?? '',
      issueDate: e.issueDate,
      validityDays: e.validityDays,
      minLeadDays: e.minLeadDays,
      maxLeadDays: e.maxLeadDays,
      materialSupply: e.materialSupply,
      estimatedMaterialCost: e.estimatedMaterialCost,
      paymentTerms: e.paymentTerms ?? '',
      bankAccountId: e.bankAccountId,
    });
    e.services.forEach((s) => this.addService({ description: s.description, internalNote: s.internalNote ?? '' }));
    e.materials.forEach((m) => this.addMaterial(m));
    e.priceLines.forEach((p) => this.addPriceLine(p));
    e.exclusions.forEach((x) => this.addExclusion(x));
    e.internalNotes.forEach((n) => this.internalNotes.push(this.fb.control(n)));
    if (e.services.length === 0) this.addService();
    this.selectedClauses.set(new Set(e.clauseIds));
    this.clausesDirty.set(false);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.loading.set(false);
  }

  private dropEmptyRows(): void {
    const drop = (array: FormArray, isEmpty: (v: Record<string, unknown>) => boolean) => {
      for (let i = array.length - 1; i >= 0; i--) if (isEmpty(array.at(i).value)) array.removeAt(i);
    };
    drop(this.services, (v) => !String(v['description'] ?? '').trim());
    drop(this.materials, (v) => !String(v['description'] ?? '').trim());
    drop(this.priceLines, (v) => !String(v['description'] ?? '').trim() && v['amount'] == null);
    for (let i = this.exclusions.length - 1; i >= 0; i--) if (!this.exclusions.at(i).value.trim()) this.exclusions.removeAt(i);
  }

  private fail(e: unknown): void {
    this.error.set(errorMessage(e));
    this.loading.set(false);
  }
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
