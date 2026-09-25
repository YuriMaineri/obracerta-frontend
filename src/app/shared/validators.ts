import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isValidCnpj, isValidCpf, onlyDigits } from './br-formats';

/**
 * Validadores de formulario. Campos vazios passam: obrigatoriedade e papel do
 * Validators.required, para cada campo poder ser opcional ou nao.
 */

export type TaxIdKind = 'cpf' | 'cnpj';

/** CPF ou CNPJ conforme o tipo de pessoa, lido na hora da validacao. */
export function taxIdValidator(kind: () => TaxIdKind): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const digits = onlyDigits(control.value);
    if (!digits) return null;
    const expected = kind() === 'cpf' ? 11 : 14;
    if (digits.length !== expected) return { taxIdIncomplete: { expected, actual: digits.length } };
    const valid = kind() === 'cpf' ? isValidCpf(digits) : isValidCnpj(digits);
    return valid ? null : { taxIdInvalid: true };
  };
}

/**
 * E-mail com dominio completo. O Validators.email do Angular aceita "joao@empresa",
 * sem ponto no dominio, o que nao serve para enviar a proposta.
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

export function emailValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  if (!value) return null;
  return EMAIL_PATTERN.test(value) ? null : { email: true };
}

/** Telefone com DDD: 10 digitos (fixo) ou 11 (celular, comecando com 9 apos o DDD). */
export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const d = onlyDigits(control.value);
  if (!d) return null;
  if (d.length === 10 && /^[1-9]{2}[2-5]/.test(d)) return null;
  if (d.length === 11 && /^[1-9]{2}9/.test(d)) return null;
  return { phone: true };
}

export function postalCodeValidator(control: AbstractControl): ValidationErrors | null {
  const d = onlyDigits(control.value);
  if (!d) return null;
  return d.length === 8 ? null : { postalCode: true };
}

/** Recusa texto feito so de espacos, que o Validators.required deixa passar. */
export function notBlankValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
}
