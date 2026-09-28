import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { BlueprintDirective } from '../shared/blueprint.directive';
import { errorMessage } from '../shared/http-error';
import { Icon } from '../shared/icon';
import { BankAccountDialog } from './bank-account-dialog';
import { CompanyHeader } from './company-header';
import { BankAccount, formatPixKey, proposalLine } from './company.model';
import { CompanyService } from './company.service';

@Component({
  selector: 'app-bank-accounts',
  imports: [BlueprintDirective, Icon, CompanyHeader, BankAccountDialog],
  templateUrl: './bank-accounts.html',
  styleUrl: './bank-accounts.scss',
})
export class BankAccounts implements OnInit {
  private readonly service = inject(CompanyService);

  protected readonly accounts = signal<BankAccount[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly dialog = signal<{ account: BankAccount | null } | null>(null);

  protected readonly selected = computed(
    () => this.accounts().find((a) => a.id === this.selectedId()) ?? this.accounts()[0] ?? null,
  );
  protected readonly defaultHolder = computed(() => this.accounts().find((a) => a.holder)?.holder ?? null);

  protected readonly formatPixKey = formatPixKey;
  protected readonly proposalLine = proposalLine;

  ngOnInit(): void {
    this.load();
  }

  protected select(account: BankAccount): void {
    this.selectedId.set(account.id);
  }

  protected openCreate(): void {
    this.dialog.set({ account: null });
  }

  protected openEdit(account: BankAccount): void {
    this.dialog.set({ account });
  }

  protected onSaved(account: BankAccount): void {
    this.dialog.set(null);
    this.load(account.id);
  }

  protected makeDefault(account: BankAccount): void {
    const { id, ...request } = account;
    this.service.saveBankAccount(id, { ...request, defaultAccount: true }).subscribe({
      next: () => this.load(id),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected remove(account: BankAccount): void {
    if (!confirm(`Remover a conta ${account.bank}? Orçamentos antigos continuam mostrando essa conta.`)) return;
    this.service.deactivateBankAccount(account.id).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private load(selectId?: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.listBankAccounts().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
        const wanted = selectId ?? this.selectedId();
        this.selectedId.set(accounts.some((a) => a.id === wanted) ? wanted : (accounts[0]?.id ?? null));
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
