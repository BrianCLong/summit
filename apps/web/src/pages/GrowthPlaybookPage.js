"use strict";
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
exports.default = GrowthPlaybookPage;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const GrowthPlaybookGenerator_1 = require("@/features/growth/GrowthPlaybookGenerator");
const GrowthPlaybookView_1 = require("@/features/growth/GrowthPlaybookView");
const toast_1 = require("@/components/ui/toast");
const PageHeader_1 = require("@/components/ui/PageHeader");
function GrowthPlaybookPage() {
    const [playbook, setPlaybook] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const { toast } = (0, toast_1.useToast)();
    const handleGenerate = async (profile) => {
        setIsLoading(true);
        try {
            // Use relative path for proxying or full URL if CORS allowed
            const response = await fetch('/api/growth/playbook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profile),
            });
            if (!response.ok) {
                throw new Error('Failed to generate playbook');
            }
            const data = await response.json();
            setPlaybook(data.data);
            toast({
                title: "Success",
                description: "Your personalized growth playbook is ready.",
            });
        }
        catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate playbook. Please try again.",
                variant: "destructive"
            });
            console.error(error);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="container mx-auto py-8 space-y-8">
      <PageHeader_1.PageHeader title="AI Growth Playbook" description="Generate a customized execution roadmap for your business using our AI engine."/>

      {!playbook ? (<GrowthPlaybookGenerator_1.GrowthPlaybookGenerator onGenerate={handleGenerate} isLoading={isLoading}/>) : (<div className="space-y-4">
          <button onClick={() => setPlaybook(null)} className="text-sm text-muted-foreground hover:text-primary mb-4">
            ← Generate another playbook
          </button>
          <GrowthPlaybookView_1.GrowthPlaybookView playbook={playbook}/>
        </div>)}
    </div>);
}
