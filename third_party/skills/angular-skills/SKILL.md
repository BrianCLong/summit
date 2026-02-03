---
name: angular-component
description: Create a modern Angular component using standalone, signals, and inject.
license: MIT
allowed-tools:
---

# Angular Component

When creating Angular components, always use `standalone: true`.
Use `signal()` for state and `input()`/`output()` for props.
Use `inject()` for dependency injection.
Use `@if`, `@for`, `@switch` for control flow.

Example:

```typescript
import { Component, signal, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from './data.service';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <ul>
        @for (item of items(); track item.id) {
          <li>{{ item.name }}</li>
        }
      </ul>
    }
  `
})
export class ExampleComponent {
  private dataService = inject(DataService);

  visible = signal(true);
  items = input<Item[]>([]);
}
```
