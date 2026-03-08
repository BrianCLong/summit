"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModernComponent = void 0;
const core_1 = require("@angular/core");
@(0, core_1.Component)({
    standalone: true,
    template: `
    @if (visible()) {
      <div>Hello</div>
    }
  `
})
class ModernComponent {
    data = (0, core_1.input)();
    visible = (0, core_1.signal)(true);
    service = (0, core_1.inject)(MyService);
}
exports.ModernComponent = ModernComponent;
