/**
 * @summit/templates
 *
 * Template management, storage, and rendering system
 */

export { TemplateManager } from './manager/TemplateManager.js';
export type {
  Template,
  TemplateVariable,
  TemplateSection,
  TemplateStyling
} from './manager/TemplateManager.js';

export { TemplateStorage } from './storage/TemplateStorage.js';
export type {
  TemplateVersion,
  TemplateMetadata
} from './storage/TemplateStorage.js';
