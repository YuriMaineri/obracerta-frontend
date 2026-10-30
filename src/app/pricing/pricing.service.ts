import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PricingSettings } from './pricing.model';

@Injectable({ providedIn: 'root' })
export class PricingApi {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/pricing/settings';

  get(): Observable<PricingSettings> {
    return this.http.get<PricingSettings>(this.url);
  }

  update(settings: PricingSettings): Observable<PricingSettings> {
    return this.http.put<PricingSettings>(this.url, settings);
  }
}
