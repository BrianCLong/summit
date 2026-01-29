import { Component, signal, input, inject } from '@angular/core';

@Component({
  standalone: true,
  template: `
    @if (visible()) {
      <div>Hello</div>
    }
  `
})
export class ModernComponent {
  data = input<string>();
  visible = signal(true);

  private service = inject(MyService);
}
