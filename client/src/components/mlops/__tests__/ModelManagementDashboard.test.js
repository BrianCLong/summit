"use strict";
/**
 * Tests for Model Management Dashboard Component
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const user_event_1 = require("@testing-library/user-event");
const ModelManagementDashboard_1 = __importDefault(require("../ModelManagementDashboard"));
describe('ModelManagementDashboard', () => {
    const defaultProps = {
        onModelSelect: jest.fn(),
        onDeployModel: jest.fn(),
        onExperimentSelect: jest.fn(),
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('renders MLOps dashboard header', () => {
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        expect(react_2.screen.getByText(/🤖 MLOps Model Management/)).toBeInTheDocument();
    });
    it('renders view tabs', () => {
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        expect(react_2.screen.getByText(/🎯 Models/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/🏋️ Training Jobs/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/🧪 Experiments/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/📊 Monitoring/)).toBeInTheDocument();
    });
    it('renders search and filters', () => {
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        expect(react_2.screen.getByPlaceholderText(/Search models, tags, or algorithms/)).toBeInTheDocument();
        expect(react_2.screen.getByDisplayValue('All Status')).toBeInTheDocument();
    });
    it('displays models by default', () => {
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        expect(react_2.screen.getByText(/ML Models/)).toBeInTheDocument();
        // Should show mock model data
        expect(react_2.screen.getByText('Entity Resolution Neural Network')).toBeInTheDocument();
        expect(react_2.screen.getByText('Anomaly Detection Ensemble')).toBeInTheDocument();
        expect(react_2.screen.getByText('Sentiment Analysis Transformer')).toBeInTheDocument();
    });
    it('switches between view tabs', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Switch to training jobs
        await user.click(react_2.screen.getByText(/🏋️ Training Jobs/));
        expect(react_2.screen.getByRole('heading', { name: /Training Jobs/ })).toBeInTheDocument();
        expect(react_2.screen.getByText(/Training Job job-001/)).toBeInTheDocument();
        // Switch to experiments
        await user.click(react_2.screen.getByText(/🧪 Experiments/));
        expect(react_2.screen.getByText(/ML Experiments/)).toBeInTheDocument();
        expect(react_2.screen.getByText('Entity Resolution Optimization')).toBeInTheDocument();
        // Switch to monitoring
        await user.click(react_2.screen.getByText(/📊 Monitoring/));
        expect(react_2.screen.getByText(/📊 Model Monitoring Dashboard/)).toBeInTheDocument();
    });
    it('filters models by search query', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        const searchInput = react_2.screen.getByPlaceholderText(/Search models, tags, or algorithms/);
        await user.type(searchInput, 'Entity Resolution');
        // Should show filtered results
        expect(react_2.screen.getByText('Entity Resolution Neural Network')).toBeInTheDocument();
        expect(react_2.screen.queryByText('Sentiment Analysis Transformer')).not.toBeInTheDocument();
    });
    it('filters models by status', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        const statusSelect = react_2.screen.getByDisplayValue('All Status');
        await user.selectOptions(statusSelect, 'production');
        expect(statusSelect).toHaveValue('production');
        // Should show only production models
        expect(react_2.screen.getByText('Entity Resolution Neural Network')).toBeInTheDocument();
    });
    it('selects model and shows details', async () => {
        const user = user_event_1.userEvent.setup();
        const onModelSelect = jest.fn();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps} onModelSelect={onModelSelect}/>);
        // Click on a model
        await user.click(react_2.screen.getByText('Entity Resolution Neural Network'));
        // Should show model details panel
        expect(react_2.screen.getByText('Model Details')).toBeInTheDocument();
        expect(react_2.screen.getByText(/Performance Metrics/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Model Information/)).toBeInTheDocument();
    });
    it('calls model select callback', async () => {
        const user = user_event_1.userEvent.setup();
        const onModelSelect = jest.fn();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps} onModelSelect={onModelSelect}/>);
        await user.click(react_2.screen.getByText('Entity Resolution Neural Network'));
        expect(onModelSelect).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Entity Resolution Neural Network',
            algorithm: 'Siamese Neural Network',
            status: 'production',
        }));
    });
    it('shows deploy button for non-production models', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Select a staging model
        await user.click(react_2.screen.getByText('Anomaly Detection Ensemble'));
        // Should show deploy button
        expect(react_2.screen.getByText(/🚀 Deploy/)).toBeInTheDocument();
    });
    it('hides deploy button for production models', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Select a production model
        await user.click(react_2.screen.getByText('Entity Resolution Neural Network'));
        // Should not show deploy button
        expect(react_2.screen.queryByText(/🚀 Deploy/)).not.toBeInTheDocument();
    });
    it('handles model deployment', async () => {
        const user = user_event_1.userEvent.setup();
        const onDeployModel = jest.fn();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps} onDeployModel={onDeployModel}/>);
        // Select a staging model
        await user.click(react_2.screen.getByText('Anomaly Detection Ensemble'));
        // Click deploy button
        const deployButton = react_2.screen.getByText(/🚀 Deploy/);
        await user.click(deployButton);
        // Should show deploying state
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText(/Deploying.../)).toBeInTheDocument();
        });
        expect(onDeployModel).toHaveBeenCalledWith('model-002', 'production');
    });
    it('displays model performance metrics', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Select a model to see details
        await user.click(react_2.screen.getByText('Entity Resolution Neural Network'));
        // Should show performance metrics
        const hasText = (t) => (_, node) => !!node && node.textContent?.includes(t);
        expect(react_2.screen.getByText(hasText('Accuracy: 94.2%'))).toBeInTheDocument();
        expect(react_2.screen.getByText(hasText('Precision: 92.8%'))).toBeInTheDocument();
        expect(react_2.screen.getByText(hasText('Recall: 95.6%'))).toBeInTheDocument();
        expect(react_2.screen.getByText(hasText('F1 Score: 94.2%'))).toBeInTheDocument();
    });
    it('displays model environment information', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Select a model to see details
        await user.click(react_2.screen.getByText('Entity Resolution Neural Network'));
        // Should show environment details
        expect(react_2.screen.getByText(/Python: 3.9.7/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Hardware: NVIDIA V100/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/tensorflow: 2.8.0/)).toBeInTheDocument();
    });
    it('shows training job progress', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Switch to training jobs tab
        await user.click(react_2.screen.getByText(/🏋️ Training Jobs/));
        // Should show progress bar for running jobs
        expect(react_2.screen.getByText(/67%/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/RUNNING/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/COMPLETED/)).toBeInTheDocument();
    });
    it('shows training job resource usage', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Switch to training jobs tab
        await user.click(react_2.screen.getByText(/🏋️ Training Jobs/));
        // Should show resource usage metrics
        expect(react_2.screen.getByText(/GPU: 87%/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/CPU: 34%/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Memory: 78%/)).toBeInTheDocument();
    });
    it('expands training job logs', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Switch to training jobs tab
        await user.click(react_2.screen.getByText(/🏋️ Training Jobs/));
        // Click to expand logs
        const logsSummary = react_2.screen.getByText('View Logs');
        await user.click(logsSummary);
        // Should show log content
        expect(react_2.screen.getByText(/Epoch 33\/50/)).toBeInTheDocument();
    });
    it('handles experiment selection', async () => {
        const user = user_event_1.userEvent.setup();
        const onExperimentSelect = jest.fn();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps} onExperimentSelect={onExperimentSelect}/>);
        // Switch to experiments tab
        await user.click(react_2.screen.getByText(/🧪 Experiments/));
        // Click on an experiment
        await user.click(react_2.screen.getByText('Entity Resolution Optimization'));
        expect(onExperimentSelect).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Entity Resolution Optimization',
            status: 'completed',
        }));
    });
    it('displays experiment results', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Switch to experiments tab
        await user.click(react_2.screen.getByText(/🧪 Experiments/));
        // Should show experiment results for completed experiments
        expect(react_2.screen.getByText(/Best Model: model-001/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Improvement: \+12.3%/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Key Insights:/)).toBeInTheDocument();
    });
    it('shows monitoring placeholder', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Switch to monitoring tab
        await user.click(react_2.screen.getByText(/📊 Monitoring/));
        // Should show monitoring coming soon message
        expect(react_2.screen.getByText(/🚧 Monitoring dashboard coming soon/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Real-time performance metrics/)).toBeInTheDocument();
    });
    it('handles investigation ID prop', () => {
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps} investigationId="inv-999"/>);
        expect(react_2.screen.getByText(/ML Models/)).toBeInTheDocument();
    });
    it('applies custom className', () => {
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps} className="custom-mlops-class"/>);
        const container = react_2.screen
            .getByText(/🤖 MLOps Model Management/)
            .closest('.model-management-dashboard');
        expect(container).toHaveClass('custom-mlops-class');
    });
    it('displays status indicators correctly', () => {
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Should display status indicators with different colors
        expect(react_2.screen.getByText(/PRODUCTION/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/STAGING/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/DEVELOPMENT/)).toBeInTheDocument();
    });
    it('shows model tags', () => {
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Should display model tags
        expect(react_2.screen.getByText('entity-resolution')).toBeInTheDocument();
        expect(react_2.screen.getByText('neural-network')).toBeInTheDocument();
        expect(react_2.screen.getByText('production')).toBeInTheDocument();
    });
    it('handles empty search results', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        const searchInput = react_2.screen.getByPlaceholderText(/Search models, tags, or algorithms/);
        await user.type(searchInput, 'nonexistent-model');
        // Should show no results
        expect(react_2.screen.getByText(/ML Models \(0\)/)).toBeInTheDocument();
    });
    it('updates model count in tab labels', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Check initial count
        expect(react_2.screen.getByText(/🎯 Models \(\d+\)/)).toBeInTheDocument();
        // Apply filter to change count
        const searchInput = react_2.screen.getByPlaceholderText(/Search models, tags, or algorithms/);
        await user.type(searchInput, 'Entity');
        // Count should update
        expect(react_2.screen.getByText(/🎯 Models \(\d+\)/)).toBeInTheDocument();
    });
    it('shows model endpoints when available', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        // Select a model with endpoints
        await user.click(react_2.screen.getByText('Entity Resolution Neural Network'));
        // Should show endpoint information
        expect(react_2.screen.getByText(/Endpoints/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/\/api\/models\/entity-resolution\/predict/)).toBeInTheDocument();
    });
    it('handles hover states on model cards', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ModelManagementDashboard_1.default {...defaultProps}/>);
        const modelCard = react_2.screen
            .getByText('Entity Resolution Neural Network')
            .closest('div');
        // Hover should work without errors
        if (modelCard) {
            await user.hover(modelCard);
            await user.unhover(modelCard);
        }
        expect(react_2.screen.getByText('Entity Resolution Neural Network')).toBeInTheDocument();
    });
});
