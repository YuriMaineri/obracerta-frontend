import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { BankAccount, BankAccountRequest, Clause, ClauseRequest, Company, CompanyRequest } from './company.model';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/company';

  /** Nome exibido na barra superior: nome fantasia ou, na falta dele, a razão social. */
  readonly displayName = signal<string | null>(null);

  refreshDisplayName(): void {
    this.get().subscribe({ next: (c) => this.setDisplayName(c), error: () => this.displayName.set(null) });
  }

  get(): Observable<Company> {
    return this.http.get<Company>(this.baseUrl);
  }

  update(request: CompanyRequest): Observable<Company> {
    return this.http.put<Company>(this.baseUrl, request).pipe(tap((c) => this.setDisplayName(c)));
  }

  logoUrl(version: number): string {
    return `${this.baseUrl}/logo?v=${version}`;
  }

  uploadLogo(file: File): Observable<void> {
    const form = new FormData();
    form.append('file', file);
    return this.http.put<void>(`${this.baseUrl}/logo`, form);
  }

  removeLogo(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/logo`);
  }

  listBankAccounts(): Observable<BankAccount[]> {
    return this.http.get<BankAccount[]>(`${this.baseUrl}/bank-accounts`);
  }

  saveBankAccount(id: number | null, request: BankAccountRequest): Observable<BankAccount> {
    return id
      ? this.http.put<BankAccount>(`${this.baseUrl}/bank-accounts/${id}`, request)
      : this.http.post<BankAccount>(`${this.baseUrl}/bank-accounts`, request);
  }

  deactivateBankAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/bank-accounts/${id}`);
  }

  listClauses(): Observable<Clause[]> {
    return this.http.get<Clause[]>(`${this.baseUrl}/clauses`);
  }

  saveClause(id: number | null, request: ClauseRequest): Observable<Clause> {
    return id
      ? this.http.put<Clause>(`${this.baseUrl}/clauses/${id}`, request)
      : this.http.post<Clause>(`${this.baseUrl}/clauses`, request);
  }

  deactivateClause(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/clauses/${id}`);
  }

  private setDisplayName(company: Company): void {
    this.displayName.set(company.tradeName || company.legalName);
  }
}
