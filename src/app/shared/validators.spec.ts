import { FormControl } from '@angular/forms';
import { emailValidator, notBlankValidator, phoneValidator, postalCodeValidator, taxIdValidator } from './validators';

describe('taxIdValidator', () => {
  it('validates CPF or CNPJ depending on the current kind', () => {
    let kind: 'cpf' | 'cnpj' = 'cnpj';
    const control = new FormControl('24.839.705/0001-65', taxIdValidator(() => kind));
    expect(control.errors).toBeNull();

    kind = 'cpf';
    control.updateValueAndValidity();
    expect(control.errors?.['taxIdIncomplete']).toBeTruthy();
  });

  it('flags invalid check digits', () => {
    const control = new FormControl('529.982.247-26', taxIdValidator(() => 'cpf'));
    expect(control.errors).toEqual({ taxIdInvalid: true });
  });

  it('lets empty values pass (field is optional)', () => {
    expect(new FormControl('', taxIdValidator(() => 'cpf')).errors).toBeNull();
  });
});

describe('emailValidator', () => {
  it('requires a domain with a dot', () => {
    expect(emailValidator(new FormControl('joao@empresa'))).toEqual({ email: true });
    expect(emailValidator(new FormControl('joao@empresa.com.br'))).toBeNull();
  });
});

describe('phoneValidator', () => {
  it('accepts landline and mobile, rejects incomplete numbers', () => {
    expect(phoneValidator(new FormControl('(51) 3333-4444'))).toBeNull();
    expect(phoneValidator(new FormControl('(51) 99999-8888'))).toBeNull();
    expect(phoneValidator(new FormControl('(51) 9999-888'))).toEqual({ phone: true });
    expect(phoneValidator(new FormControl('(51) 89999-8888'))).toEqual({ phone: true });
  });
});

describe('postalCodeValidator', () => {
  it('requires 8 digits', () => {
    expect(postalCodeValidator(new FormControl('90000-000'))).toBeNull();
    expect(postalCodeValidator(new FormControl('9000-000'))).toEqual({ postalCode: true });
  });
});

describe('notBlankValidator', () => {
  it('rejects whitespace-only text', () => {
    expect(notBlankValidator(new FormControl('   '))).toEqual({ blank: true });
    expect(notBlankValidator(new FormControl('Cartório'))).toBeNull();
  });
});
