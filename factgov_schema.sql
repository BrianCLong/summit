CREATE TABLE factgov_vendors (
    vendor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50),  -- EIN for compliance
    products JSONB,  -- List of product IDs from your catalog
    certifications JSONB,  -- FactCert validator certs
    cooperative_memberships TEXT[],  -- ["TXShare", "MMSA"]
    compliance_docs JSONB,  -- {"SOC2": "url", "FedRAMP": "url"}
    performance_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE factgov_agencies (
    agency_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_name VARCHAR(255) NOT NULL,
    agency_type VARCHAR(50),  -- federal, state, local
    jurisdiction VARCHAR(100),  -- "California", "NYC", "Federal"
    budget_authority NUMERIC,
    procurement_officer_email VARCHAR(255),
    cooperative_membership VARCHAR(100),  -- "TXShare"
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE factgov_contracts (
    contract_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES factgov_agencies(agency_id),
    vendor_id UUID REFERENCES factgov_vendors(vendor_id),
    product_id VARCHAR(100),  -- "factflow", "factlaw", etc.
    contract_value NUMERIC NOT NULL,
    platform_fee NUMERIC,  -- 12% to FactGov
    validator_commission NUMERIC,  -- 5% to validator
    net_to_vendor NUMERIC,  -- 83% to vendor
    status VARCHAR(50),  -- "pending", "active", "completed"
    start_date DATE,
    end_date DATE,
    audit_report_id UUID,  -- Link to FactCert audit
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE factgov_rfps (
    rfp_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES factgov_agencies(agency_id),
    title VARCHAR(500),
    description TEXT,
    requirements JSONB,  -- Extracted using your NLP
    budget NUMERIC,
    deadline DATE,
    matched_vendors UUID[],  -- Array of vendor_ids
    status VARCHAR(50),  -- "open", "closed", "awarded"
    created_at TIMESTAMP DEFAULT NOW()
);
