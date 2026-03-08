"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyComponent = void 0;
const core_1 = require("@angular/core");
@(0, core_1.Component)({
    selector: 'app-legacy',
    template: `
    <div *ngIf="isVisible">
      <ul>
        <li *ngFor="let item of items">{{item}}</li>
      </ul>
    </div>
  `
})
class LegacyComponent {
    service;
    @(0, core_1.Input)()
    data;
    isVisible = false;
    items = [];
    constructor(service) {
        this.service = service;
    }
    ngOnInit() { }
}
exports.LegacyComponent = LegacyComponent;
