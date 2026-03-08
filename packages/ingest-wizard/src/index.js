"use strict";
/**
 * @intelgraph/ingest-wizard
 * Shared UI components for data ingestion with DPIA compliance
 */
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
exports.createDataSourceRegistration = exports.createLicenseEnforcementClient = exports.IngestWizard = exports.DPIAStep = exports.DataSourceStep = exports.StepIndicator = exports.DPIAFormSchema = exports.DataSourceConfigSchema = void 0;
const react_1 = __importStar(require("react"));
const zod_1 = require("zod");
const Form = __importStar(require("@radix-ui/react-form"));
const Select = __importStar(require("@radix-ui/react-select"));
const Checkbox = __importStar(require("@radix-ui/react-checkbox"));
const Progress = __importStar(require("@radix-ui/react-progress"));
const clsx_1 = require("clsx");
// Schemas
exports.DataSourceConfigSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Data source name is required'),
    source_type: zod_1.z.enum(['csv', 'json', 'elasticsearch', 'esri', 'api']),
    source_config: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    license_template: zod_1.z.string().optional(),
    custom_license: zod_1.z
        .object({
        name: zod_1.z.string(),
        type: zod_1.z.enum(['commercial', 'open_source', 'proprietary', 'restricted']),
        restrictions: zod_1.z.object({
            commercial_use: zod_1.z.boolean(),
            export_allowed: zod_1.z.boolean(),
            research_only: zod_1.z.boolean(),
            attribution_required: zod_1.z.boolean(),
            share_alike: zod_1.z.boolean(),
        }),
    })
        .optional(),
    tos_accepted: zod_1.z.boolean(),
    retention_period: zod_1.z.number().min(1).max(2555), // max 7 years
    geographic_restrictions: zod_1.z.array(zod_1.z.string()),
});
exports.DPIAFormSchema = zod_1.z.object({
    processing_purpose: zod_1.z
        .string()
        .min(10, 'Please provide detailed processing purpose'),
    data_categories: zod_1.z
        .array(zod_1.z.string())
        .min(1, 'Select at least one data category'),
    retention_justification: zod_1.z
        .string()
        .min(10, 'Retention justification required'),
    security_measures: zod_1.z.array(zod_1.z.string()).min(1, 'Select security measures'),
    third_party_sharing: zod_1.z.boolean(),
    automated_decision_making: zod_1.z.boolean(),
    pii_classification: zod_1.z.enum(['none', 'low', 'medium', 'high', 'critical']),
});
const StepIndicator = ({ currentStep, totalSteps, steps, }) => {
    return (<div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (<div key={index} className="flex flex-col items-center">
            <div className={(0, clsx_1.clsx)('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', index < currentStep
                ? 'bg-green-500 text-white'
                : index === currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500')}>
              {index < currentStep ? '✓' : index + 1}
            </div>
            <div className="text-xs mt-2 text-center max-w-20">{step}</div>
          </div>))}
      </div>
      <Progress.Root className="relative overflow-hidden bg-gray-200 rounded-full w-full h-2 mt-4">
        <Progress.Indicator className="bg-blue-500 w-full h-full transition-transform duration-300 ease-out" style={{
            transform: `translateX(-${100 - (currentStep / totalSteps) * 100}%)`,
        }}/>
      </Progress.Root>
    </div>);
};
exports.StepIndicator = StepIndicator;
const DataSourceStep = ({ config, onChange, onNext, }) => {
    const [licenseTemplates] = (0, react_1.useState)([
        { id: 'cc-by-4.0', name: 'Creative Commons Attribution 4.0' },
        {
            id: 'commercial-restricted',
            name: 'Commercial License - Export Restricted',
        },
        { id: 'research-only', name: 'Academic Research Only' },
        { id: 'custom', name: 'Custom License' },
    ]);
    const handleSubmit = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        try {
            // Validate current step
            const stepSchema = exports.DataSourceConfigSchema.pick({
                name: true,
                source_type: true,
                license_template: true,
            });
            stepSchema.parse(config);
            onNext();
        }
        catch (error) {
            console.error('Validation failed:', error);
        }
    }, [config, onNext]);
    return (<div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Data Source Configuration</h2>

      <Form.Root onSubmit={handleSubmit}>
        <Form.Field name="name" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            Data Source Name
          </Form.Label>
          <Form.Control asChild>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md" type="text" value={config.name || ''} onChange={(e) => onChange({ ...config, name: e.target.value })} placeholder="Enter descriptive name for data source"/>
          </Form.Control>
          <Form.Message className="text-red-500 text-sm mt-1" match="valueMissing">
            Please enter a data source name
          </Form.Message>
        </Form.Field>

        <Form.Field name="source_type" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            Source Type
          </Form.Label>
          <Select.Root value={config.source_type || ''} onValueChange={(value) => onChange({ ...config, source_type: value })}>
            <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
              <Select.Value placeholder="Select source type"/>
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  <Select.Item value="csv">
                    <Select.ItemText>CSV File</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="json">
                    <Select.ItemText>JSON API</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="elasticsearch">
                    <Select.ItemText>Elasticsearch</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="esri">
                    <Select.ItemText>ESRI ArcGIS</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="api">
                    <Select.ItemText>REST API</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Form.Field>

        <Form.Field name="license_template" className="mb-6">
          <Form.Label className="block text-sm font-medium mb-2">
            License Template
          </Form.Label>
          <Select.Root value={config.license_template || ''} onValueChange={(value) => onChange({ ...config, license_template: value })}>
            <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
              <Select.Value placeholder="Select license template"/>
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {licenseTemplates.map((template) => (<Select.Item key={template.id} value={template.id}>
                      <Select.ItemText>{template.name}</Select.ItemText>
                    </Select.Item>))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Form.Field>

        <Form.Submit asChild>
          <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600">
            Next: DPIA Assessment
          </button>
        </Form.Submit>
      </Form.Root>
    </div>);
};
exports.DataSourceStep = DataSourceStep;
const DPIAStep = ({ assessment, onChange, onNext, onBack, }) => {
    const dataCategories = [
        'Personal identifiers',
        'Contact information',
        'Financial data',
        'Health information',
        'Biometric data',
        'Location data',
        'Behavioral data',
        'Professional information',
    ];
    const securityMeasures = [
        'Encryption at rest',
        'Encryption in transit',
        'Access controls',
        'Audit logging',
        'Data anonymization',
        'Regular security assessments',
        'Staff training',
        'Incident response plan',
    ];
    const handleSubmit = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        try {
            exports.DPIAFormSchema.parse(assessment);
            onNext();
        }
        catch (error) {
            console.error('DPIA validation failed:', error);
        }
    }, [assessment, onNext]);
    return (<div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">
        Data Protection Impact Assessment
      </h2>

      <Form.Root onSubmit={handleSubmit}>
        <Form.Field name="processing_purpose" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            Processing Purpose *
          </Form.Label>
          <Form.Control asChild>
            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3} value={assessment.processing_purpose || ''} onChange={(e) => onChange({ ...assessment, processing_purpose: e.target.value })} placeholder="Describe the purpose and legal basis for processing this data"/>
          </Form.Control>
        </Form.Field>

        <Form.Field name="data_categories" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            Data Categories *
          </Form.Label>
          <div className="space-y-2">
            {dataCategories.map((category) => (<div key={category} className="flex items-center space-x-2">
                <Checkbox.Root className="w-4 h-4 border border-gray-300 rounded" checked={assessment.data_categories?.includes(category) || false} onCheckedChange={(checked) => {
                const current = assessment.data_categories || [];
                const updated = checked
                    ? [...current, category]
                    : current.filter((c) => c !== category);
                onChange({ ...assessment, data_categories: updated });
            }}>
                  <Checkbox.Indicator className="text-blue-500">
                    ✓
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label className="text-sm">{category}</label>
              </div>))}
          </div>
        </Form.Field>

        <Form.Field name="pii_classification" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            PII Risk Classification *
          </Form.Label>
          <Select.Root value={assessment.pii_classification || ''} onValueChange={(value) => onChange({ ...assessment, pii_classification: value })}>
            <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
              <Select.Value placeholder="Select risk level"/>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  <Select.Item value="none">
                    <Select.ItemText>None - No PII</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="low">
                    <Select.ItemText>Low - Basic identifiers</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="medium">
                    <Select.ItemText>Medium - Contact info</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="high">
                    <Select.ItemText>
                      High - Financial/health data
                    </Select.ItemText>
                  </Select.Item>
                  <Select.Item value="critical">
                    <Select.ItemText>
                      Critical - Biometric/sensitive
                    </Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Form.Field>

        <Form.Field name="security_measures" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            Security Measures *
          </Form.Label>
          <div className="space-y-2">
            {securityMeasures.map((measure) => (<div key={measure} className="flex items-center space-x-2">
                <Checkbox.Root className="w-4 h-4 border border-gray-300 rounded" checked={assessment.security_measures?.includes(measure) || false} onCheckedChange={(checked) => {
                const current = assessment.security_measures || [];
                const updated = checked
                    ? [...current, measure]
                    : current.filter((m) => m !== measure);
                onChange({ ...assessment, security_measures: updated });
            }}>
                  <Checkbox.Indicator className="text-blue-500">
                    ✓
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label className="text-sm">{measure}</label>
              </div>))}
          </div>
        </Form.Field>

        <div className="flex space-x-4">
          <button type="button" onClick={onBack} className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600">
            Back
          </button>
          <Form.Submit asChild>
            <button type="submit" className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600">
              Next: Review & Submit
            </button>
          </Form.Submit>
        </div>
      </Form.Root>
    </div>);
};
exports.DPIAStep = DPIAStep;
const IngestWizard = ({ onComplete, onCancel, }) => {
    const [currentStep, setCurrentStep] = (0, react_1.useState)(0);
    const [dataSourceConfig, setDataSourceConfig] = (0, react_1.useState)({});
    const [dpiaAssessment, setDPIAAssessment] = (0, react_1.useState)({});
    const steps = ['Data Source', 'DPIA Assessment', 'Review'];
    const handleNext = (0, react_1.useCallback)(() => {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }, [steps.length]);
    const handleBack = (0, react_1.useCallback)(() => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    }, []);
    const handleComplete = (0, react_1.useCallback)(() => {
        try {
            const validConfig = exports.DataSourceConfigSchema.parse(dataSourceConfig);
            const validDPIA = exports.DPIAFormSchema.parse(dpiaAssessment);
            onComplete(validConfig, validDPIA);
        }
        catch (error) {
            console.error('Final validation failed:', error);
        }
    }, [dataSourceConfig, dpiaAssessment, onComplete]);
    return (<div className="min-h-screen bg-gray-50">
      <exports.StepIndicator currentStep={currentStep} totalSteps={steps.length} steps={steps}/>

      <div className="py-8">
        {currentStep === 0 && (<exports.DataSourceStep config={dataSourceConfig} onChange={setDataSourceConfig} onNext={handleNext}/>)}

        {currentStep === 1 && (<exports.DPIAStep assessment={dpiaAssessment} onChange={setDPIAAssessment} onNext={handleNext} onBack={handleBack}/>)}

        {currentStep === 2 && (<div className="max-w-2xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6">Review & Submit</h2>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="font-semibold mb-4">Data Source Configuration</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Name:</strong> {dataSourceConfig.name}
                </div>
                <div>
                  <strong>Type:</strong> {dataSourceConfig.source_type}
                </div>
                <div>
                  <strong>License:</strong> {dataSourceConfig.license_template}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="font-semibold mb-4">DPIA Assessment</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>PII Classification:</strong>{' '}
                  {dpiaAssessment.pii_classification}
                </div>
                <div>
                  <strong>Data Categories:</strong>{' '}
                  {dpiaAssessment.data_categories?.join(', ')}
                </div>
                <div>
                  <strong>Security Measures:</strong>{' '}
                  {dpiaAssessment.security_measures?.length} selected
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button type="button" onClick={handleBack} className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600">
                Back
              </button>
              <button type="button" onClick={handleComplete} className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600">
                Complete Setup
              </button>
            </div>
          </div>)}
      </div>

      {onCancel && (<div className="fixed top-4 right-4">
          <button onClick={onCancel} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">
            Cancel
          </button>
        </div>)}
    </div>);
};
exports.IngestWizard = IngestWizard;
// Utility functions
const createLicenseEnforcementClient = (baseUrl) => ({
    async checkCompliance(operation, dataSourceIds, purpose) {
        const response = await fetch(`${baseUrl}/compliance/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation,
                data_source_ids: dataSourceIds,
                purpose,
            }),
        });
        return response.json();
    },
});
exports.createLicenseEnforcementClient = createLicenseEnforcementClient;
const createDataSourceRegistration = (baseUrl) => ({
    async registerDataSource(config) {
        const response = await fetch(`${baseUrl}/data-sources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        return response.json();
    },
    async submitDPIA(dataSourceId, assessment) {
        const response = await fetch(`${baseUrl}/dpia/assessment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...assessment,
                data_source_id: dataSourceId,
            }),
        });
        return response.json();
    },
});
exports.createDataSourceRegistration = createDataSourceRegistration;
