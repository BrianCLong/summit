"use strict";
/**
 * Terrorist Finance Types
 * Types for terrorist financing tracking and analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanctionType = exports.SupportType = exports.TransactionMethod = exports.EntityStatus = exports.EntityType = void 0;
var EntityType;
(function (EntityType) {
    EntityType["INDIVIDUAL"] = "INDIVIDUAL";
    EntityType["ORGANIZATION"] = "ORGANIZATION";
    EntityType["BUSINESS"] = "BUSINESS";
    EntityType["CHARITY"] = "CHARITY";
    EntityType["FINANCIAL_INSTITUTION"] = "FINANCIAL_INSTITUTION";
    EntityType["SHELL_COMPANY"] = "SHELL_COMPANY";
})(EntityType || (exports.EntityType = EntityType = {}));
var EntityStatus;
(function (EntityStatus) {
    EntityStatus["ACTIVE"] = "ACTIVE";
    EntityStatus["INACTIVE"] = "INACTIVE";
    EntityStatus["FROZEN"] = "FROZEN";
    EntityStatus["UNDER_INVESTIGATION"] = "UNDER_INVESTIGATION";
})(EntityStatus || (exports.EntityStatus = EntityStatus = {}));
var TransactionMethod;
(function (TransactionMethod) {
    TransactionMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    TransactionMethod["CASH"] = "CASH";
    TransactionMethod["HAWALA"] = "HAWALA";
    TransactionMethod["CRYPTOCURRENCY"] = "CRYPTOCURRENCY";
    TransactionMethod["MONEY_SERVICE"] = "MONEY_SERVICE";
    TransactionMethod["TRADE_BASED"] = "TRADE_BASED";
    TransactionMethod["CASH_COURIER"] = "CASH_COURIER";
    TransactionMethod["PREPAID_CARD"] = "PREPAID_CARD";
    TransactionMethod["ONLINE_PAYMENT"] = "ONLINE_PAYMENT";
})(TransactionMethod || (exports.TransactionMethod = TransactionMethod = {}));
var SupportType;
(function (SupportType) {
    SupportType["FINANCIAL"] = "FINANCIAL";
    SupportType["WEAPONS"] = "WEAPONS";
    SupportType["TRAINING"] = "TRAINING";
    SupportType["SAFE_HAVEN"] = "SAFE_HAVEN";
    SupportType["LOGISTICAL"] = "LOGISTICAL";
    SupportType["INTELLIGENCE"] = "INTELLIGENCE";
})(SupportType || (exports.SupportType = SupportType = {}));
var SanctionType;
(function (SanctionType) {
    SanctionType["ASSET_FREEZE"] = "ASSET_FREEZE";
    SanctionType["TRAVEL_BAN"] = "TRAVEL_BAN";
    SanctionType["ARMS_EMBARGO"] = "ARMS_EMBARGO";
    SanctionType["TRADE_RESTRICTION"] = "TRADE_RESTRICTION";
    SanctionType["FINANCIAL_RESTRICTION"] = "FINANCIAL_RESTRICTION";
})(SanctionType || (exports.SanctionType = SanctionType = {}));
