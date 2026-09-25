import { applyMask, formatPhone, isValidCnpj, isValidCpf, MASKS } from './br-formats';

describe('isValidCpf', () => {
  it('accepts a valid CPF with or without mask', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('rejects wrong check digits', () => {
    expect(isValidCpf('529.982.247-26')).toBe(false);
  });

  it('rejects repeated digits, which pass the checksum', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidCpf('5299822472')).toBe(false);
  });
});

describe('isValidCnpj', () => {
  it('accepts the Maineri CNPJ', () => {
    expect(isValidCnpj('24.839.705/0001-65')).toBe(true);
  });

  it('rejects wrong check digits', () => {
    expect(isValidCnpj('24.839.705/0001-66')).toBe(false);
    expect(isValidCnpj('12.345.678/0001-90')).toBe(false);
  });

  it('rejects repeated digits', () => {
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });
});

describe('applyMask', () => {
  it('formats progressively and ignores letters', () => {
    expect(applyMask('abc123', MASKS.cpf)).toBe('123');
    expect(applyMask('1234', MASKS.cpf)).toBe('123.4');
    expect(applyMask('24839705000165', MASKS.cnpj)).toBe('24.839.705/0001-65');
  });

  it('drops digits beyond the mask', () => {
    expect(applyMask('1234567890123', MASKS.cpf)).toBe('123.456.789-01');
  });
});

describe('formatPhone', () => {
  it('uses landline mask up to 10 digits and mobile mask for 11', () => {
    expect(formatPhone('5133334444')).toBe('(51) 3333-4444');
    expect(formatPhone('51999998888')).toBe('(51) 99999-8888');
  });
});
