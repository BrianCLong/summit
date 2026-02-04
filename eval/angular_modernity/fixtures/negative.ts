import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-legacy',
  template: `
    <div *ngIf="isVisible">
      <ul>
        <li *ngFor="let item of items">{{item}}</li>
      </ul>
    </div>
  `
})
export class LegacyComponent implements OnInit {
  @Input() data: string;
  isVisible = false;
  items = [];

  constructor(private service: MyService) {}

  ngOnInit() {}
}
