import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private checked = false;

  readonly user = signal<CurrentUser | null>(null);

  /** Pergunta à API quem está logado só uma vez; depois vale o que o login e o logout disserem. */
  ensureSession(): Observable<boolean> {
    if (this.user()) return of(true);
    if (this.checked) return of(false);
    return this.http.get<CurrentUser>('/api/auth/me').pipe(
      tap((u) => this.user.set(u)),
      map(() => true),
      catchError(() => of(false)),
      finalize(() => (this.checked = true)),
    );
  }

  login(email: string, password: string): Observable<CurrentUser> {
    return this.http.post<CurrentUser>('/api/auth/login', { email, password }).pipe(tap((u) => this.user.set(u)));
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(finalize(() => this.clear()));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>('/api/auth/password', { currentPassword, newPassword });
  }

  clear(): void {
    this.user.set(null);
    this.checked = true;
  }
}
