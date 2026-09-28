import { Component, computed, input } from '@angular/core';

type Shape =
  | { el: 'path'; d: string }
  | { el: 'circle'; cx: number; cy: number; r: number }
  | { el: 'rect'; x: number; y: number; width: number; height: number; rx: number };

/** Ícones no traço do Lucide (1.5px), desenhados em SVG inline. */
const ICONS: Record<string, Shape[]> = {
  plus: [{ el: 'path', d: 'M5 12h14' }, { el: 'path', d: 'M12 5v14' }],
  search: [{ el: 'circle', cx: 11, cy: 11, r: 8 }, { el: 'path', d: 'm21 21-4.3-4.3' }],
  x: [{ el: 'path', d: 'M18 6 6 18' }, { el: 'path', d: 'm6 6 12 12' }],
  pencil: [
    { el: 'path', d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z' },
  ],
  user: [{ el: 'path', d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' }, { el: 'circle', cx: 12, cy: 7, r: 4 }],
  phone: [
    { el: 'path', d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' },
  ],
  mail: [
    { el: 'rect', x: 2, y: 4, width: 20, height: 16, rx: 2 },
    { el: 'path', d: 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' },
  ],
  'map-pin': [{ el: 'path', d: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' }, { el: 'circle', cx: 12, cy: 10, r: 3 }],
  landmark: [
    { el: 'path', d: 'M10 18v-7' },
    { el: 'path', d: 'M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z' },
    { el: 'path', d: 'M14 18v-7' },
    { el: 'path', d: 'M18 18v-7' },
    { el: 'path', d: 'M3 22h18' },
    { el: 'path', d: 'M6 18v-7' },
  ],
  upload: [
    { el: 'path', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' },
    { el: 'path', d: 'm17 8-5-5-5 5' },
    { el: 'path', d: 'M12 3v12' },
  ],
  info: [{ el: 'circle', cx: 12, cy: 12, r: 10 }, { el: 'path', d: 'M12 16v-4' }, { el: 'path', d: 'M12 8h.01' }],
};

@Component({
  selector: 'app-icon',
  host: { class: 'icon', 'aria-hidden': 'true' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      @for (s of shapes(); track $index) {
        @switch (s.el) {
          @case ('path') { <svg:path [attr.d]="$any(s).d" /> }
          @case ('circle') { <svg:circle [attr.cx]="$any(s).cx" [attr.cy]="$any(s).cy" [attr.r]="$any(s).r" /> }
          @case ('rect') {
            <svg:rect [attr.x]="$any(s).x" [attr.y]="$any(s).y" [attr.width]="$any(s).width"
                      [attr.height]="$any(s).height" [attr.rx]="$any(s).rx" />
          }
        }
      }
    </svg>
  `,
  styles: `:host { display: inline-flex; flex: none; } svg { display: block; }`,
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input(16);
  protected readonly shapes = computed(() => ICONS[this.name()] ?? []);
}
