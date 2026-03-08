"use strict";
/**
 * Propaganda Analysis Types
 * Types for terrorist propaganda and messaging analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionQuality = exports.ThemeType = exports.ContentType = void 0;
var ContentType;
(function (ContentType) {
    ContentType["VIDEO"] = "VIDEO";
    ContentType["AUDIO"] = "AUDIO";
    ContentType["ARTICLE"] = "ARTICLE";
    ContentType["MAGAZINE"] = "MAGAZINE";
    ContentType["POSTER"] = "POSTER";
    ContentType["SOCIAL_MEDIA_POST"] = "SOCIAL_MEDIA_POST";
    ContentType["NASHEED"] = "NASHEED";
    ContentType["SERMON"] = "SERMON";
    ContentType["STATEMENT"] = "STATEMENT";
    ContentType["MANIFESTO"] = "MANIFESTO";
})(ContentType || (exports.ContentType = ContentType = {}));
var ThemeType;
(function (ThemeType) {
    ThemeType["MARTYRDOM"] = "MARTYRDOM";
    ThemeType["VICTIMIZATION"] = "VICTIMIZATION";
    ThemeType["CONSPIRACY"] = "CONSPIRACY";
    ThemeType["RELIGIOUS_DUTY"] = "RELIGIOUS_DUTY";
    ThemeType["REVENGE"] = "REVENGE";
    ThemeType["HEROISM"] = "HEROISM";
    ThemeType["UTOPIA"] = "UTOPIA";
    ThemeType["APOCALYPSE"] = "APOCALYPSE";
    ThemeType["ENEMY_DEHUMANIZATION"] = "ENEMY_DEHUMANIZATION";
    ThemeType["IN_GROUP_SOLIDARITY"] = "IN_GROUP_SOLIDARITY";
})(ThemeType || (exports.ThemeType = ThemeType = {}));
var ProductionQuality;
(function (ProductionQuality) {
    ProductionQuality["PROFESSIONAL"] = "PROFESSIONAL";
    ProductionQuality["SEMI_PROFESSIONAL"] = "SEMI_PROFESSIONAL";
    ProductionQuality["AMATEUR"] = "AMATEUR";
})(ProductionQuality || (exports.ProductionQuality = ProductionQuality = {}));
