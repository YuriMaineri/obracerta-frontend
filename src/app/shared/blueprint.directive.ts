import { Directive, ElementRef, OnInit, Renderer2, inject } from '@angular/core';

/** Moldura "blueprint": borda reta com quatro marcas de registro nos cantos. */
@Directive({
  selector: '[appBlueprint]',
  host: { class: 'blueprint' },
})
export class BlueprintDirective implements OnInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  ngOnInit(): void {
    for (const position of ['tl', 'tr', 'bl', 'br']) {
      const corner = this.renderer.createElement('i');
      this.renderer.addClass(corner, 'corner');
      this.renderer.addClass(corner, position);
      this.renderer.setAttribute(corner, 'aria-hidden', 'true');
      this.renderer.appendChild(this.host.nativeElement, corner);
    }
  }
}
