"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaMappingStep = void 0;
const nanoid_1 = require("nanoid");
require("../styles.css");
const ensureId = (value) => ({
    ...value,
    mappings: value.mappings.map((mapping) => ({
        ...mapping,
        id: mapping.id || (0, nanoid_1.nanoid)(8)
    }))
});
const SchemaMappingStep = ({ value, onChange, onNext, onBack, disabled }) => {
    const hydrated = ensureId(value);
    const handleMappingChange = (index, field, input) => {
        const next = hydrated.mappings.map((mapping, mappingIndex) => {
            if (mappingIndex !== index)
                return mapping;
            return {
                ...mapping,
                [field]: field === 'required' ? Boolean(input) : input
            };
        });
        onChange({ ...hydrated, mappings: next });
    };
    const handleAddMapping = () => {
        const next = {
            ...hydrated,
            mappings: [
                ...hydrated.mappings,
                {
                    id: (0, nanoid_1.nanoid)(8),
                    sourceField: hydrated.sourceSample[0]?.name ?? '',
                    targetField: hydrated.targetSchema[0]?.name ?? '',
                    required: false
                }
            ]
        };
        onChange(next);
    };
    const handleRemoveMapping = (index) => {
        const next = hydrated.mappings.filter((_, mappingIndex) => mappingIndex !== index);
        onChange({ ...hydrated, mappings: next });
    };
    const availableSourceFields = hydrated.sourceSample.map((field) => field.name);
    const availableTargetFields = hydrated.targetSchema.map((field) => field.name);
    return (<section className="iw-section">
      <header>
        <h2>Schema mapping</h2>
        <p className="description">
          Align the incoming feed columns to IntelGraph's canonical schema. Automatic suggestions are highlighted and can be overridden.
        </p>
      </header>

      <div className="iw-table-wrapper">
        <table className="iw-table">
          <thead>
            <tr>
              <th>Source field</th>
              <th>Target field</th>
              <th>Transformation</th>
              <th>Required</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hydrated.mappings.length === 0 && (<tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#61748f' }}>
                  No field mappings yet. Use the button below to begin aligning fields.
                </td>
              </tr>)}

            {hydrated.mappings.map((mapping, index) => (<tr key={mapping.id}>
                <td>
                  <select className="iw-select" value={mapping.sourceField} onChange={(event) => handleMappingChange(index, 'sourceField', event.target.value)} disabled={disabled}>
                    {availableSourceFields.map((sourceField) => (<option key={sourceField} value={sourceField}>
                        {sourceField}
                      </option>))}
                  </select>
                </td>
                <td>
                  <select className="iw-select" value={mapping.targetField} onChange={(event) => handleMappingChange(index, 'targetField', event.target.value)} disabled={disabled}>
                    {availableTargetFields.map((targetField) => (<option key={targetField} value={targetField}>
                        {targetField}
                      </option>))}
                  </select>
                </td>
                <td>
                  <input type="text" className="iw-text-input" placeholder="Optional transformation" value={mapping.transformation ?? ''} onChange={(event) => handleMappingChange(index, 'transformation', event.target.value)} disabled={disabled}/>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={Boolean(mapping.required)} onChange={(event) => handleMappingChange(index, 'required', event.target.checked)} disabled={disabled}/>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button type="button" className="iw-button iw-button-tertiary" onClick={() => handleRemoveMapping(index)} disabled={disabled}>
                    Remove
                  </button>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px' }}>
        <button type="button" className="iw-button iw-button-tertiary" onClick={handleAddMapping} disabled={disabled || availableSourceFields.length === 0 || availableTargetFields.length === 0}>
          + Add mapping
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="iw-button iw-button-secondary" onClick={onBack} disabled={disabled}>
            Back
          </button>
          <button type="button" className="iw-button iw-button-primary" onClick={onNext} disabled={disabled || hydrated.mappings.length === 0}>
            Continue to validation
          </button>
        </div>
      </div>
    </section>);
};
exports.SchemaMappingStep = SchemaMappingStep;
exports.default = exports.SchemaMappingStep;
