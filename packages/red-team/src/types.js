"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialEngineeringType = exports.KillChainPhase = exports.MITRETactic = void 0;
/**
 * MITRE ATT&CK Tactics
 */
var MITRETactic;
(function (MITRETactic) {
    MITRETactic["RECONNAISSANCE"] = "reconnaissance";
    MITRETactic["RESOURCE_DEVELOPMENT"] = "resource-development";
    MITRETactic["INITIAL_ACCESS"] = "initial-access";
    MITRETactic["EXECUTION"] = "execution";
    MITRETactic["PERSISTENCE"] = "persistence";
    MITRETactic["PRIVILEGE_ESCALATION"] = "privilege-escalation";
    MITRETactic["DEFENSE_EVASION"] = "defense-evasion";
    MITRETactic["CREDENTIAL_ACCESS"] = "credential-access";
    MITRETactic["DISCOVERY"] = "discovery";
    MITRETactic["LATERAL_MOVEMENT"] = "lateral-movement";
    MITRETactic["COLLECTION"] = "collection";
    MITRETactic["COMMAND_AND_CONTROL"] = "command-and-control";
    MITRETactic["EXFILTRATION"] = "exfiltration";
    MITRETactic["IMPACT"] = "impact";
})(MITRETactic || (exports.MITRETactic = MITRETactic = {}));
/**
 * Kill Chain Phases
 */
var KillChainPhase;
(function (KillChainPhase) {
    KillChainPhase["RECONNAISSANCE"] = "reconnaissance";
    KillChainPhase["WEAPONIZATION"] = "weaponization";
    KillChainPhase["DELIVERY"] = "delivery";
    KillChainPhase["EXPLOITATION"] = "exploitation";
    KillChainPhase["INSTALLATION"] = "installation";
    KillChainPhase["COMMAND_AND_CONTROL"] = "command-and-control";
    KillChainPhase["ACTIONS_ON_OBJECTIVES"] = "actions-on-objectives";
})(KillChainPhase || (exports.KillChainPhase = KillChainPhase = {}));
/**
 * Social Engineering Types
 */
var SocialEngineeringType;
(function (SocialEngineeringType) {
    SocialEngineeringType["PHISHING"] = "phishing";
    SocialEngineeringType["SPEAR_PHISHING"] = "spear-phishing";
    SocialEngineeringType["WHALING"] = "whaling";
    SocialEngineeringType["VISHING"] = "vishing";
    SocialEngineeringType["SMISHING"] = "smishing";
    SocialEngineeringType["PRETEXTING"] = "pretexting";
    SocialEngineeringType["BAITING"] = "baiting";
    SocialEngineeringType["QUID_PRO_QUO"] = "quid-pro-quo";
    SocialEngineeringType["TAILGATING"] = "tailgating";
    SocialEngineeringType["WATERING_HOLE"] = "watering-hole";
})(SocialEngineeringType || (exports.SocialEngineeringType = SocialEngineeringType = {}));
