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
exports.CreateTenantPage = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const zod_2 = require("zod");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const select_1 = require("@/components/ui/select");
const Alert_1 = require("@/components/ui/Alert");
const react_router_dom_1 = require("react-router-dom");
const createTenantSchema = zod_2.z.object({
    name: zod_2.z.string().min(2, 'Name must be at least 2 characters'),
    slug: zod_2.z
        .string()
        .min(3, 'Slug must be at least 3 characters')
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    residency: zod_2.z.enum(['US', 'EU']),
});
const CreateTenantPage = () => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [error, setError] = (0, react_1.useState)(null);
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    const form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(createTenantSchema),
        defaultValues: {
            name: '',
            slug: '',
            residency: 'US',
        },
    });
    const onSubmit = async (data) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await fetch('/api/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Assuming Auth token is handled by a global interceptor or cookie
                    // If not, we might need to retrieve it from localStorage
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to create tenant');
            }
            // Success!
            navigate(`/dashboard?tenantId=${result.data.id}`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <Card_1.Card className="w-full max-w-md">
        <Card_1.CardHeader>
          <Card_1.CardTitle>Create New Organization</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (<Alert_1.Alert variant="destructive">
                <Alert_1.AlertTitle>Error</Alert_1.AlertTitle>
                <Alert_1.AlertDescription>{error}</Alert_1.AlertDescription>
              </Alert_1.Alert>)}

            <div className="space-y-2">
              <label_1.Label htmlFor="name">Organization Name</label_1.Label>
              <input_1.Input id="name" placeholder="Acme Corp" {...form.register('name')}/>
              {form.formState.errors.name && (<p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>)}
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="slug">Slug (URL)</label_1.Label>
              <input_1.Input id="slug" placeholder="acme-corp" {...form.register('slug')}/>
              {form.formState.errors.slug && (<p className="text-sm text-red-500">
                  {form.formState.errors.slug.message}
                </p>)}
              <p className="text-xs text-muted-foreground">
                This will be used in your organization's URL.
              </p>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="residency">Data Residency</label_1.Label>
              <select_1.Select onValueChange={(value) => form.setValue('residency', value)} defaultValue="US">
                <select_1.SelectTrigger>
                  <select_1.SelectValue placeholder="Select Region"/>
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  <select_1.SelectItem value="US">United States (US)</select_1.SelectItem>
                  <select_1.SelectItem value="EU">Europe (EU)</select_1.SelectItem>
                </select_1.SelectContent>
              </select_1.Select>
              {form.formState.errors.residency && (<p className="text-sm text-red-500">
                  {form.formState.errors.residency.message}
                </p>)}
              <p className="text-xs text-muted-foreground">
                Choose where your data will be physically stored.
              </p>
            </div>

            <Button_1.Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </Button_1.Button>
          </form>
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
};
exports.CreateTenantPage = CreateTenantPage;
exports.default = exports.CreateTenantPage;
