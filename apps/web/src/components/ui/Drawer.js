"use strict";
// @ts-nocheck
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawerDescription = exports.DrawerTitle = exports.DrawerFooter = exports.DrawerHeader = exports.DrawerContent = exports.DrawerClose = exports.DrawerTrigger = exports.DrawerOverlay = exports.DrawerPortal = exports.Drawer = void 0;
const React = __importStar(require("react"));
const DialogPrimitive = __importStar(require("@radix-ui/react-dialog"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const Drawer = DialogPrimitive.Root;
exports.Drawer = Drawer;
const DrawerTrigger = DialogPrimitive.Trigger;
exports.DrawerTrigger = DrawerTrigger;
const DrawerPortal = DialogPrimitive.Portal;
exports.DrawerPortal = DrawerPortal;
const DrawerClose = DialogPrimitive.Close;
exports.DrawerClose = DrawerClose;
const DrawerOverlay = React.forwardRef(({ className, ...props }, ref) => (<DialogPrimitive.Overlay ref={ref} className={(0, utils_1.cn)('fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', className)} {...props}/>));
exports.DrawerOverlay = DrawerOverlay;
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DrawerContent = React.forwardRef(({ side = 'right', className, children, ...props }, ref) => (<DrawerPortal>
    <DrawerOverlay />
    <DialogPrimitive.Content ref={ref} className={(0, utils_1.cn)('fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500', {
        'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm': side === 'left',
        'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm': side === 'right',
        'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top': side === 'top',
        'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom': side === 'bottom',
    }, className)} {...props}>
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <lucide_react_1.X className="h-4 w-4"/>
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DrawerPortal>));
exports.DrawerContent = DrawerContent;
DrawerContent.displayName = DialogPrimitive.Content.displayName;
const DrawerHeader = ({ className, ...props }) => (<div className={(0, utils_1.cn)('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props}/>);
exports.DrawerHeader = DrawerHeader;
DrawerHeader.displayName = 'DrawerHeader';
const DrawerFooter = ({ className, ...props }) => (<div className={(0, utils_1.cn)('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props}/>);
exports.DrawerFooter = DrawerFooter;
DrawerFooter.displayName = 'DrawerFooter';
const DrawerTitle = React.forwardRef(({ className, ...props }, ref) => (<DialogPrimitive.Title ref={ref} className={(0, utils_1.cn)('text-lg font-semibold leading-none tracking-tight', className)} {...props}/>));
exports.DrawerTitle = DrawerTitle;
DrawerTitle.displayName = DialogPrimitive.Title.displayName;
const DrawerDescription = React.forwardRef(({ className, ...props }, ref) => (<DialogPrimitive.Description ref={ref} className={(0, utils_1.cn)('text-sm text-muted-foreground', className)} {...props}/>));
exports.DrawerDescription = DrawerDescription;
DrawerDescription.displayName = DialogPrimitive.Description.displayName;
