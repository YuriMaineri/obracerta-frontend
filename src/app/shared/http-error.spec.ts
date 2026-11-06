import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from './http-error';

describe('errorMessage', () => {
  it('uses the detail sent by the API', () => {
    const error = new HttpErrorResponse({ status: 429, error: { detail: 'Muitas tentativas com senha errada. Tente de novo em 15 min.' } });
    expect(errorMessage(error)).toBe('Muitas tentativas com senha errada. Tente de novo em 15 min.');
  });

  it('explains when the server cannot be reached or is waking up', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('conexão');
    expect(errorMessage(new HttpErrorResponse({ status: 504 }))).toBe('O servidor está iniciando. Tente de novo em instantes.');
  });
});
