import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn & CanActivateChildFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureSession().pipe(
    map((ok) => ok || router.createUrlTree(['/login'], { queryParams: state.url && state.url !== '/' ? { returnUrl: state.url } : {} })),
  );
};
