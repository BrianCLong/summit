"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortBy = exports.unique = exports.normalize = void 0;
const normalize = (value) => value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
exports.normalize = normalize;
const unique = (values) => Array.from(new Set(values));
exports.unique = unique;
const sortBy = (items, iteratee) => [...items].sort((a, b) => iteratee(a).localeCompare(iteratee(b)));
exports.sortBy = sortBy;
