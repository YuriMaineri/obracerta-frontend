import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Customer, CustomerRequest, Page } from './customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/customers';

  search(query: string, page: number, size = 20): Observable<Page<Customer>> {
    const params = new HttpParams()
      .set('query', query)
      .set('page', page)
      .set('size', size)
      .set('sort', 'name');
    return this.http.get<Page<Customer>>(this.baseUrl, { params });
  }

  findById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/${id}`);
  }

  create(request: CustomerRequest): Observable<Customer> {
    return this.http.post<Customer>(this.baseUrl, request);
  }

  update(id: number, request: CustomerRequest): Observable<Customer> {
    return this.http.put<Customer>(`${this.baseUrl}/${id}`, request);
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

/** Extrai a mensagem do ProblemDetail devolvido pela API (campo "detail"). */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Não foi possível falar com a API. Ela está rodando na porta 8080?';
    return error.error?.detail ?? `Erro ${error.status} ao falar com a API.`;
  }
  return 'Erro inesperado.';
}
