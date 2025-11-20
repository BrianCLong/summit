-- Sample data for development and testing

-- Insert sample nodes
INSERT INTO supply_chain_nodes (id, type, name, tier, status, criticality, country, city, latitude, longitude) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'supplier', 'ACME Components Inc.', 1, 'active', 'critical', 'China', 'Shenzhen', 22.5431, 114.0579),
('550e8400-e29b-41d4-a716-446655440002', 'manufacturer', 'TechManufacturing Co.', 1, 'active', 'high', 'Taiwan', 'Taipei', 25.0330, 121.5654),
('550e8400-e29b-41d4-a716-446655440003', 'supplier', 'Global Electronics', 2, 'active', 'medium', 'South Korea', 'Seoul', 37.5665, 126.9780),
('550e8400-e29b-41d4-a716-446655440004', 'logistics-provider', 'FastShip Logistics', 1, 'active', 'high', 'United States', 'Los Angeles', 34.0522, -118.2437),
('550e8400-e29b-41d4-a716-446655440005', 'warehouse', 'Central Warehouse', 1, 'active', 'medium', 'United States', 'Chicago', 41.8781, -87.6298);

-- Insert sample relationships
INSERT INTO supply_chain_relationships (source_node_id, target_node_id, relationship_type, strength, lead_time_days, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'supplies', 0.9, 14, true),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'supplies', 0.7, 7, true),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'transports', 0.8, 21, true),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'warehouses', 0.9, 2, true);

-- Insert sample components
INSERT INTO components (id, part_number, name, category, is_critical, lead_time_days, unit_cost, currency, obsolescence_risk) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'IC-2024-001', 'Integrated Circuit XYZ', 'Electronics', true, 30, 15.50, 'USD', 'medium'),
('650e8400-e29b-41d4-a716-446655440002', 'PCB-2024-001', 'Printed Circuit Board', 'Electronics', true, 21, 45.00, 'USD', 'low'),
('650e8400-e29b-41d4-a716-446655440003', 'RES-2024-001', 'Resistor 10K', 'Electronics', false, 7, 0.05, 'USD', 'low');

-- Insert sample risk assessments
INSERT INTO risk_assessments (node_id, category, level, score, indicators) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'financial', 'medium', 65, '{"indicators": [{"name": "Credit Rating", "value": "BBB", "impact": "neutral"}]}'),
('550e8400-e29b-41d4-a716-446655440001', 'cybersecurity', 'high', 55, '{"indicators": [{"name": "Security Score", "value": 55, "impact": "negative"}]}'),
('550e8400-e29b-41d4-a716-446655440002', 'operational', 'low', 85, '{"indicators": [{"name": "On-Time Delivery", "value": 0.95, "impact": "positive"}]}');

-- Insert sample compliance requirements
INSERT INTO compliance_requirements (title, category, jurisdiction, description, applicable_node_types, effective_date) VALUES
('Export Control Compliance', 'export-control', 'United States', 'EAR and ITAR compliance for controlled items', ARRAY['supplier', 'manufacturer'], '2020-01-01'),
('Conflict Minerals Reporting', 'conflict-minerals', 'United States', 'SEC conflict minerals reporting requirements', ARRAY['supplier', 'raw-material-provider'], '2012-08-22'),
('ISO 9001 Certification', 'quality', 'International', 'Quality management system certification', ARRAY['supplier', 'manufacturer'], '2015-09-15');

-- Insert sample incidents
INSERT INTO incidents (type, title, description, severity, status, affected_nodes, detected_at, reported_at) VALUES
('disruption', 'Port Congestion at Shanghai', 'Severe congestion affecting multiple shipments', 'high', 'mitigating',
 ARRAY['550e8400-e29b-41d4-a716-446655440001'::uuid], '2024-01-10 08:00:00+00', '2024-01-10 09:00:00+00'),
('quality-issue', 'Defective Component Batch', 'Batch IC-2024-001-A showing high defect rate', 'medium', 'investigating',
 ARRAY['550e8400-e29b-41d4-a716-446655440001'::uuid], '2024-01-12 14:30:00+00', '2024-01-12 15:00:00+00');

COMMIT;
