"use strict";
/**
 * Canonical Entity Types for Summit Platform
 *
 * Defines the 8 core entity types with bitemporal fields:
 * - Person, Organization, Asset, Location
 * - Event, Document, Claim, Case
 *
 * All entities implement the CanonicalEntity interface with:
 * - validFrom/validTo: Business validity window
 * - observedAt: When the fact was observed in the real world
 * - recordedAt: When recorded in the system (immutable)
 *
 * @module canonical-entities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPerson = isPerson;
exports.isOrganization = isOrganization;
exports.isAsset = isAsset;
exports.isLocation = isLocation;
exports.isEvent = isEvent;
exports.isDocument = isDocument;
exports.isClaim = isClaim;
exports.isCase = isCase;
exports.isAccount = isAccount;
exports.isCommunication = isCommunication;
exports.isDevice = isDevice;
exports.isVehicle = isVehicle;
exports.isInfrastructure = isInfrastructure;
exports.isFinancialInstrument = isFinancialInstrument;
exports.isIndicator = isIndicator;
exports.isNarrative = isNarrative;
exports.isCampaign = isCampaign;
exports.isAuthority = isAuthority;
exports.isLicense = isLicense;
// -----------------------------------------------------------------------------
// Type Guards
// -----------------------------------------------------------------------------
function isPerson(entity) {
    return entity.entityType === 'Person';
}
function isOrganization(entity) {
    return entity.entityType === 'Organization';
}
function isAsset(entity) {
    return entity.entityType === 'Asset';
}
function isLocation(entity) {
    return entity.entityType === 'Location';
}
function isEvent(entity) {
    return entity.entityType === 'Event';
}
function isDocument(entity) {
    return entity.entityType === 'Document';
}
function isClaim(entity) {
    return entity.entityType === 'Claim';
}
function isCase(entity) {
    return entity.entityType === 'Case';
}
function isAccount(entity) {
    return entity.entityType === 'Account';
}
function isCommunication(entity) {
    return entity.entityType === 'Communication';
}
function isDevice(entity) {
    return entity.entityType === 'Device';
}
function isVehicle(entity) {
    return entity.entityType === 'Vehicle';
}
function isInfrastructure(entity) {
    return entity.entityType === 'Infrastructure';
}
function isFinancialInstrument(entity) {
    return entity.entityType === 'FinancialInstrument';
}
function isIndicator(entity) {
    return entity.entityType === 'Indicator';
}
function isNarrative(entity) {
    return entity.entityType === 'Narrative';
}
function isCampaign(entity) {
    return entity.entityType === 'Campaign';
}
function isAuthority(entity) {
    return entity.entityType === 'Authority';
}
function isLicense(entity) {
    return entity.entityType === 'License';
}
