import { Component, input, output } from '@angular/core';
import { BlueprintDirective } from './blueprint.directive';
import { Icon } from './icon';

/** Modal com cabeçalho escuro. Fecha no X, no Esc e no clique fora da caixa. */
@Component({
  selector: 'app-dialog',
  imports: [BlueprintDirective, Icon],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div class="box" appBlueprint [style.width.px]="width()" role="dialog" aria-modal="true"
           [attr.aria-label]="title()" (click)="$event.stopPropagation()">
        <header>
          <span class="title">{{ title() }}</span>
          <button type="button" class="btn btn-icon close" aria-label="Fechar" (click)="closed.emit()">
            <app-icon name="x" [size]="18" />
          </button>
        </header>
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 16px;
      background: rgba(43, 43, 45, 0.5);
    }
    .box {
      max-width: 100%;
      max-height: calc(100vh - 32px);
      display: flex;
      flex-direction: column;
      background: var(--color-bg);
      box-shadow: var(--shadow-lg);
    }
    header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      background: var(--color-accent-900);
      color: var(--color-bg);
    }
    .title { font-family: var(--font-heading); font-weight: 600; font-size: 26px; line-height: 1.1; }
    .close { margin-left: auto; color: var(--color-bg); border-color: transparent; }
    .close:hover { background: rgba(255, 255, 255, 0.1); }
  `,
})
export class Dialog {
  readonly title = input.required<string>();
  readonly width = input(620);
  readonly closed = output<void>();
}
