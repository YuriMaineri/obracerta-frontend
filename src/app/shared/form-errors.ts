import { AbstractControl } from '@angular/forms';

/** Mensagem do primeiro erro do campo, exibida só depois que a pessoa passou por ele. */
export function fieldErrorMessage(control: AbstractControl, taxIdLabel = 'CNPJ'): string | null {
  const e = control.errors;
  if (!e || !control.touched) return null;
  if (e['required'] || e['blank']) return 'Obrigatório.';
  if (e['taxIdIncomplete']) return `${taxIdLabel} incompleto.`;
  if (e['taxIdInvalid']) return `${taxIdLabel} inválido. Confira os dígitos.`;
  if (e['email']) return 'E-mail inválido. Ex.: nome@empresa.com.br';
  if (e['phone']) return 'Telefone inválido. Ex.: (51) 3333-4444 ou (51) 99999-8888';
  if (e['postalCode']) return 'CEP deve ter 8 dígitos.';
  if (e['maxlength']) return `Máximo de ${e['maxlength'].requiredLength} caracteres.`;
  if (e['min']) return `Valor mínimo: ${e['min'].min}.`;
  return 'Valor inválido.';
}
