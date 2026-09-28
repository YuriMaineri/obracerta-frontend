import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EstimateDetails, EstimatePage, EstimateRequest, EstimateStatus } from './estimate.model';

@Injectable({ providedIn: 'root' })
export class EstimateService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/estimates';

  search(filters: { query?: string; status?: EstimateStatus | null; customerId?: number | null }, page = 0, size = 50): Observable<EstimatePage> {
    let params = new HttpParams().set('page', page).set('size', size).append('sort', 'issueDate,desc').append('sort', 'number,desc');
    if (filters.query) params = params.set('query', filters.query);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.customerId) params = params.set('customerId', filters.customerId);
    return this.http.get<EstimatePage>(this.baseUrl, { params });
  }

  findById(id: number): Observable<EstimateDetails> {
    return this.http.get<EstimateDetails>(`${this.baseUrl}/${id}`);
  }

  save(id: number | null, request: EstimateRequest): Observable<EstimateDetails> {
    return id
      ? this.http.put<EstimateDetails>(`${this.baseUrl}/${id}`, request)
      : this.http.post<EstimateDetails>(this.baseUrl, request);
  }

  duplicate(id: number): Observable<EstimateDetails> {
    return this.http.post<EstimateDetails>(`${this.baseUrl}/${id}/duplicate`, {});
  }

  changeStatus(id: number, status: EstimateStatus): Observable<EstimateDetails> {
    return this.http.put<EstimateDetails>(`${this.baseUrl}/${id}/status`, { status });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
