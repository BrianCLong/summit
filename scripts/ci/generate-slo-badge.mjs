#!/usr/bin/env node
import { register } from 'prom-client';
import fetch from 'node-fetch';
import fs from 'fs/promises';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';
const BADGE_OUTPUT = process.env.BADGE_OUTPUT || '.badges/slo-status.svg';

async function queryPrometheus(query) {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.data?.result[0]?.value[1];
}

async function generateBadge() {
  try {
    // Query SLO compliance
    const latencySLO = await queryPrometheus('slo_compliance_ratio{metric_type="latency_p95"}');
    const errorSLO = await queryPrometheus('slo_compliance_ratio{metric_type="error_rate"}');
    
    const latencyCompliant = parseFloat(latencySLO) === 1;
    const errorCompliant = parseFloat(errorSLO) === 1;
    const allCompliant = latencyCompliant && errorCompliant;
    
    // Generate badge SVG
    const color = allCompliant ? 'brightgreen' : 'red';
    const status = allCompliant ? 'passing' : 'failing';
    const badgeUrl = `https://img.shields.io/badge/SLO-${status}-${color}`;
    
    const badgeResponse = await fetch(badgeUrl);
    const badgeSvg = await badgeResponse.text();
    
    // Write badge to file
    await fs.mkdir('.badges', { recursive: true });
    await fs.writeFile(BADGE_OUTPUT, badgeSvg);
    
    console.log(`Badge generated: ${BADGE_OUTPUT}`);
    console.log(`SLO Status: ${status}`);
    
    // Exit with error if SLO failing (for CI)
    process.exit(allCompliant ? 0 : 1);
    
  } catch (error) {
    console.error('Badge generation failed:', error);
    process.exit(1);
  }
}

generateBadge();