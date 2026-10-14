
export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const checkDigit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(d[i]) * (length + 1 - i);
    return ((sum * 10) % 11) % 10;
  };
  return checkDigit(9) === Number(d[9]) && checkDigit(10) === Number(d[10]);
}

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const checkDigit = (length: number) => {
    let sum = 0;
    let weight = length - 7;
    for (let i = 0; i < length; i++) {
      sum += Number(d[i]) * weight--;
      if (weight < 2) weight = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return checkDigit(12) === Number(d[12]) && checkDigit(13) === Number(d[13]);
}

/** Máscara em que "0" é dígito e o resto é literal; formata enquanto a pessoa digita. */
export function applyMask(value: string, mask: string): string {
  const digits = onlyDigits(value);
  let result = '';
  let di = 0;
  for (const ch of mask) {
    if (di >= digits.length) break;
    if (ch === '0') {
      result += digits[di++];
    } else {
      result += ch;
    }
  }
  return result;
}

export const MASKS = {
  cpf: '000.000.000-00',
  cnpj: '00.000.000/0000-00',
  postalCode: '00000-000',
  landline: '(00) 0000-0000',
  mobile: '(00) 00000-0000',
} as const;

export function formatCpf(value: string | null | undefined): string {
  return applyMask(value ?? '', MASKS.cpf);
}

export function formatCnpj(value: string | null | undefined): string {
  return applyMask(value ?? '', MASKS.cnpj);
}

/** Fixo tem 10 digitos com DDD; celular tem 11. A mascara acompanha o que foi digitado. */
export function formatPhone(value: string | null | undefined): string {
  const d = onlyDigits(value);
  return applyMask(d, d.length > 10 ? MASKS.mobile : MASKS.landline);
}

export function formatPostalCode(value: string | null | undefined): string {
  return applyMask(value ?? '', MASKS.postalCode);
}
