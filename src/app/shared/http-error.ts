import { HttpErrorResponse } from '@angular/common/http';

/** Extrai a mensagem do ProblemDetail devolvido pela API (campo "detail"). */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Não foi possível falar com a API. Ela está rodando na porta 8080?';
    if (error.status === 413) return 'Arquivo grande demais.';
    return error.error?.detail ?? `Erro ${error.status} ao falar com a API.`;
  }
  return 'Erro inesperado.';
}
