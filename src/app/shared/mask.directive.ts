import { Directive, ElementRef, HostListener, effect, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';
import { MASKS, applyMask, formatPhone } from './br-formats';

export type MaskType = 'cpf' | 'cnpj' | 'phone' | 'postalCode';

/**
 * Mascara de digitacao para campos numericos brasileiros.
 *
 * Uso: <input formControlName="taxId" [appMask]="'cnpj'" />
 *
 * Aceita so digitos, formata enquanto a pessoa digita ou cola, e limita o tamanho.
 * O valor do FormControl fica formatado; quem envia para a API tira a mascara.
 */
@Directive({
  selector: 'input[appMask]',
  host: { inputmode: 'numeric', autocomplete: 'off' },
})
export class MaskDirective {
  readonly appMask = input.required<MaskType>();

  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly control = inject(NgControl, { self: true });

  constructor() {
    // Ao trocar a mascara (PF <-> PJ), reformata o que ja estiver no campo.
    effect(() => {
      const type = this.appMask();
      this.element.nativeElement.maxLength = this.maxLength(type);
      const current = this.control.value;
      if (current) this.write(current);
    });
  }

  @HostListener('input')
  onInput(): void {
    this.write(this.element.nativeElement.value);
  }

  private write(raw: string): void {
    const formatted = this.format(raw);
    if (this.element.nativeElement.value !== formatted) {
      this.element.nativeElement.value = formatted;
    }
    if (this.control.value !== formatted) {
      this.control.control?.setValue(formatted, { emitModelToViewChange: false });
    }
  }

  private format(raw: string): string {
    switch (this.appMask()) {
      case 'phone':
        return formatPhone(raw);
      case 'cpf':
        return applyMask(raw, MASKS.cpf);
      case 'cnpj':
        return applyMask(raw, MASKS.cnpj);
      case 'postalCode':
        return applyMask(raw, MASKS.postalCode);
    }
  }

  private maxLength(type: MaskType): number {
    const masks: Record<MaskType, string> = {
      cpf: MASKS.cpf,
      cnpj: MASKS.cnpj,
      phone: MASKS.mobile,
      postalCode: MASKS.postalCode,
    };
    return masks[type].length;
  }
}
