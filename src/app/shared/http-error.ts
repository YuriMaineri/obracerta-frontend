import { HttpErrorResponse } from '@angular/common/http';

/** Extrai a mensagem do ProblemDetail devolvido pela API (campo "detail"). */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Não foi possível falar com o servidor. Confira sua conexão e tente de novo.';
    // No plano gratuito a API dorme sem uso e leva alguns minutos para acordar.
    if ([502, 503, 504].includes(error.status)) return 'O servidor está iniciando. Tente de novo em instantes.';
    if (error.status === 413) return 'Arquivo grande demais.';
    return error.error?.detail ?? `Erro ${error.status} ao falar com a API.`;
  }
  return 'Erro inesperado.';
}
