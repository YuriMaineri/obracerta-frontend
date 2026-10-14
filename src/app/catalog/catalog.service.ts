import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Material,
  MaterialPrice,
  MaterialRequest,
  ServiceCategory,
  ServiceItem,
  ServiceRequest,
} from './catalog.model';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/catalog';

  listMaterials(query = ''): Observable<Material[]> {
    return this.http.get<Material[]>(`${this.baseUrl}/materials`, { params: { query } });
  }

  materialPrices(id: number): Observable<MaterialPrice[]> {
    return this.http.get<MaterialPrice[]>(`${this.baseUrl}/materials/${id}/prices`);
  }

  saveMaterial(id: number | null, request: MaterialRequest): Observable<Material> {
    return id
      ? this.http.put<Material>(`${this.baseUrl}/materials/${id}`, request)
      : this.http.post<Material>(`${this.baseUrl}/materials`, request);
  }

  deactivateMaterial(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/materials/${id}`);
  }

  listServices(query = '', category: ServiceCategory | null = null): Observable<ServiceItem[]> {
    let params = new HttpParams().set('query', query);
    if (category) params = params.set('category', category);
    return this.http.get<ServiceItem[]>(`${this.baseUrl}/services`, { params });
  }

  saveService(id: number | null, request: ServiceRequest): Observable<ServiceItem> {
    return id
      ? this.http.put<ServiceItem>(`${this.baseUrl}/services/${id}`, request)
      : this.http.post<ServiceItem>(`${this.baseUrl}/services`, request);
  }

  deactivateService(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/services/${id}`);
  }
}
