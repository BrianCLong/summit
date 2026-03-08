"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineToasts = void 0;
const react_1 = __importDefault(require("react"));
const Button_1 = require("../Button");
const toast_1 = require("../toast");
const tokens_1 = require("@/theme/tokens");
const meta = {
    title: 'Design System/Feedback/Toast',
    component: toast_1.Toast,
};
exports.default = meta;
exports.InlineToasts = {
    render: () => {
        const [open, setOpen] = react_1.default.useState(false);
        const [openReminder, setOpenReminder] = react_1.default.useState(false);
        return (<toast_1.ToastProvider swipeDirection="right">
        <div style={{
                display: 'flex',
                gap: (0, tokens_1.tokenVar)('ds-space-sm'),
                flexWrap: 'wrap',
            }}>
          <Button_1.Button onClick={() => {
                setOpen(true);
                setOpenReminder(false);
            }}>
            Show success toast
          </Button_1.Button>
          <Button_1.Button variant="secondary" onClick={() => {
                setOpenReminder(true);
                setOpen(false);
            }}>
            Show reminder toast
          </Button_1.Button>
        </div>

        <toast_1.Toast open={open} onOpenChange={setOpen} duration={4000}>
          <toast_1.ToastTitle>Saved</toast_1.ToastTitle>
          <toast_1.ToastDescription>
            Investigation settings were updated.
          </toast_1.ToastDescription>
          <toast_1.ToastAction altText="undo">Undo</toast_1.ToastAction>
        </toast_1.Toast>

        <toast_1.Toast open={openReminder} onOpenChange={setOpenReminder} duration={4500}>
          <toast_1.ToastTitle>Reminder</toast_1.ToastTitle>
          <toast_1.ToastDescription>
            Escalation runbook has pending approvals.
          </toast_1.ToastDescription>
          <toast_1.ToastAction altText="view">View</toast_1.ToastAction>
        </toast_1.Toast>

        <toast_1.ToastViewport />
      </toast_1.ToastProvider>);
    },
};
