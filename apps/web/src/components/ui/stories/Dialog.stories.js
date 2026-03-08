"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmationModal = void 0;
const react_1 = __importDefault(require("react"));
const Button_1 = require("../Button");
const Dialog_1 = require("../Dialog");
const tokens_1 = require("@/theme/tokens");
const meta = {
    title: 'Design System/Modal',
    component: Dialog_1.Dialog,
};
exports.default = meta;
exports.ConfirmationModal = {
    render: () => (<Dialog_1.Dialog>
      <Dialog_1.DialogTrigger asChild>
        <Button_1.Button>Open modal</Button_1.Button>
      </Dialog_1.DialogTrigger>
      <Dialog_1.DialogContent>
        <Dialog_1.DialogHeader>
          <Dialog_1.DialogTitle>Escalate to incident?</Dialog_1.DialogTitle>
          <Dialog_1.DialogDescription>
            Triaging as an incident will page the on-call SRE and notify the
            trust & safety bridge channel.
          </Dialog_1.DialogDescription>
        </Dialog_1.DialogHeader>
        <Dialog_1.DialogFooter style={{
            gap: (0, tokens_1.tokenVar)('ds-space-sm'),
            marginTop: (0, tokens_1.tokenVar)('ds-space-md'),
        }}>
          <Button_1.Button variant="ghost">Cancel</Button_1.Button>
          <Button_1.Button variant="destructive">Escalate</Button_1.Button>
        </Dialog_1.DialogFooter>
      </Dialog_1.DialogContent>
    </Dialog_1.Dialog>),
};
