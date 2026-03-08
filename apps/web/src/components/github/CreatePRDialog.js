"use strict";
// apps/web/src/components/github/CreatePRDialog.tsx
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
exports.CreatePRDialog = void 0;
const React = __importStar(require("react"));
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const Drawer_1 = require("@/components/ui/Drawer");
const Button_1 = require("@/components/ui/Button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const textarea_1 = require("@/components/ui/textarea");
const useGitHubIntegration_1 = require("@/hooks/useGitHubIntegration");
const CreatePRDialog = ({ repository, defaultHead = '', defaultBase = 'main', trigger, onSuccess, }) => {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [title, setTitle] = (0, react_1.useState)('');
    const [body, setBody] = (0, react_1.useState)('');
    const [head, setHead] = (0, react_1.useState)(defaultHead);
    const [base, setBase] = (0, react_1.useState)(defaultBase);
    const [draft, setDraft] = (0, react_1.useState)(false);
    const [createdPR, setCreatedPR] = (0, react_1.useState)(null);
    const createPR = (0, useGitHubIntegration_1.useCreatePullRequest)();
    const { data: branches, isLoading: branchesLoading } = (0, useGitHubIntegration_1.useGitHubBranches)(repository);
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const result = await createPR.mutateAsync({
                title,
                body,
                head,
                base,
                draft,
                repository,
            });
            setCreatedPR({ number: result.number, htmlUrl: result.htmlUrl });
            onSuccess?.({ number: result.number, htmlUrl: result.htmlUrl });
        }
        catch (error) {
            // Error handled by mutation state
        }
    };
    const handleClose = () => {
        setOpen(false);
        // Reset form after animation
        setTimeout(() => {
            setTitle('');
            setBody('');
            setHead(defaultHead);
            setBase(defaultBase);
            setDraft(false);
            setCreatedPR(null);
            createPR.reset();
        }, 300);
    };
    const handleOpenChange = (newOpen) => {
        if (!newOpen) {
            handleClose();
        }
        else {
            setOpen(true);
        }
    };
    return (<Drawer_1.Drawer open={open} onOpenChange={handleOpenChange}>
      <Drawer_1.DrawerTrigger asChild>
        {trigger || (<Button_1.Button variant="default">
            <lucide_react_1.GitPullRequest className="mr-2 h-4 w-4"/>
            Create Pull Request
          </Button_1.Button>)}
      </Drawer_1.DrawerTrigger>
      <Drawer_1.DrawerContent side="right" className="sm:max-w-md">
        <Drawer_1.DrawerHeader>
          <Drawer_1.DrawerTitle>Create Pull Request</Drawer_1.DrawerTitle>
          <Drawer_1.DrawerDescription>
            Create a new pull request for {repository}
          </Drawer_1.DrawerDescription>
        </Drawer_1.DrawerHeader>

        {createdPR ? (<div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="rounded-full bg-green-100 p-3">
              <lucide_react_1.GitPullRequest className="h-8 w-8 text-green-600"/>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                PR #{createdPR.number} Created
              </h3>
              <p className="text-sm text-muted-foreground">
                Your pull request has been created successfully.
              </p>
            </div>
            <a href={createdPR.htmlUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
              View on GitHub <lucide_react_1.ExternalLink className="h-4 w-4"/>
            </a>
            <Button_1.Button variant="outline" onClick={handleClose} className="mt-4">
              Close
            </Button_1.Button>
          </div>) : (<form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="title">Title</label_1.Label>
              <input_1.Input id="title" placeholder="feat: add new feature" value={title} onChange={e => setTitle(e.target.value)} required/>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="body">Description</label_1.Label>
              <textarea_1.Textarea id="body" placeholder="Describe the changes in this PR..." value={body} onChange={e => setBody(e.target.value)} rows={5}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label_1.Label htmlFor="head">Source Branch</label_1.Label>
                <select id="head" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={head} onChange={e => setHead(e.target.value)} required disabled={branchesLoading}>
                  <option value="">Select branch</option>
                  {branches?.map(b => (<option key={b.name} value={b.name}>
                      {b.name}
                      {b.protected ? ' (protected)' : ''}
                    </option>))}
                </select>
              </div>

              <div className="space-y-2">
                <label_1.Label htmlFor="base">Target Branch</label_1.Label>
                <select id="base" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={base} onChange={e => setBase(e.target.value)} required disabled={branchesLoading}>
                  {branches?.map(b => (<option key={b.name} value={b.name}>
                      {b.name}
                      {b.protected ? ' (protected)' : ''}
                    </option>))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="draft" checked={draft} onChange={e => setDraft(e.target.checked)} className="h-4 w-4 rounded border-gray-300"/>
              <label_1.Label htmlFor="draft" className="cursor-pointer">
                Create as draft PR
              </label_1.Label>
            </div>

            {createPR.error && (<div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {createPR.error.message}
              </div>)}

            <Drawer_1.DrawerFooter className="px-0">
              <Button_1.Button type="submit" disabled={createPR.isPending || !title || !head || !base}>
                {createPR.isPending && (<lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>)}
                Create Pull Request
              </Button_1.Button>
              <Button_1.Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button_1.Button>
            </Drawer_1.DrawerFooter>
          </form>)}
      </Drawer_1.DrawerContent>
    </Drawer_1.Drawer>);
};
exports.CreatePRDialog = CreatePRDialog;
exports.default = exports.CreatePRDialog;
