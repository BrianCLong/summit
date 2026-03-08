"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntakeValidator = void 0;
class IntakeValidator {
    validate(request) {
        const required = [
            'owner',
            'useCase',
            'problemStatement',
            'roiModel',
            'spendEstimate',
            'spendCurrency',
            'capex',
            'opex',
            'termMonths',
            'dataCategories',
            'dataFlows',
            'integrationNeeds',
            'renewalDate',
            'noticeDate',
            'seatsRequested',
            'preferredVendor',
            'vendorName',
            'criticality',
            'apiAccess',
            'handlesProductionTraffic',
            'hasSSO',
            'estimatedUsers',
        ];
        const missing = required.filter((field) => request[field] === undefined || request[field] === null);
        if (missing.length) {
            throw new Error(`Intake missing required fields: ${missing.join(', ')}`);
        }
        if ((request.capex ?? 0) < 0 || (request.opex ?? 0) < 0) {
            throw new Error('CAPEX and OPEX must be non-negative');
        }
        if ((request.seatsRequested ?? 0) <= 0) {
            throw new Error('Seats requested must be greater than zero');
        }
        const roiModel = request.roiModel.toLowerCase();
        if (!roiModel.includes('roi') && !roiModel.includes('payback')) {
            throw new Error('ROI model must describe return or payback');
        }
        return request;
    }
}
exports.IntakeValidator = IntakeValidator;
