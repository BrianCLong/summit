"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentNotificationSchema = exports.CommentVoteSchema = exports.AnnotationLayerSchema = exports.AnnotationSchema = exports.CommentReactionSchema = exports.CommentSchema = exports.CommentThreadSchema = exports.RichTextContentSchema = exports.AnnotationType = exports.ReactionType = exports.CommentStatus = void 0;
const zod_1 = require("zod");
var CommentStatus;
(function (CommentStatus) {
    CommentStatus["OPEN"] = "open";
    CommentStatus["RESOLVED"] = "resolved";
    CommentStatus["ARCHIVED"] = "archived";
})(CommentStatus || (exports.CommentStatus = CommentStatus = {}));
var ReactionType;
(function (ReactionType) {
    ReactionType["LIKE"] = "like";
    ReactionType["LOVE"] = "love";
    ReactionType["CELEBRATE"] = "celebrate";
    ReactionType["INSIGHTFUL"] = "insightful";
    ReactionType["CURIOUS"] = "curious";
    ReactionType["DISAGREE"] = "disagree";
})(ReactionType || (exports.ReactionType = ReactionType = {}));
var AnnotationType;
(function (AnnotationType) {
    AnnotationType["HIGHLIGHT"] = "highlight";
    AnnotationType["UNDERLINE"] = "underline";
    AnnotationType["STRIKETHROUGH"] = "strikethrough";
    AnnotationType["MARKER"] = "marker";
    AnnotationType["ARROW"] = "arrow";
    AnnotationType["CIRCLE"] = "circle";
    AnnotationType["RECTANGLE"] = "rectangle";
    AnnotationType["FREEHAND"] = "freehand";
    AnnotationType["TEXT"] = "text";
    AnnotationType["PIN"] = "pin";
})(AnnotationType || (exports.AnnotationType = AnnotationType = {}));
// Rich text content schema
exports.RichTextContentSchema = zod_1.z.object({
    type: zod_1.z.enum(['paragraph', 'heading', 'list', 'code', 'quote', 'mention']),
    content: zod_1.z.string(),
    attributes: zod_1.z.object({
        bold: zod_1.z.boolean().optional(),
        italic: zod_1.z.boolean().optional(),
        underline: zod_1.z.boolean().optional(),
        code: zod_1.z.boolean().optional(),
        link: zod_1.z.string().optional(),
        level: zod_1.z.number().optional() // for headings
    }).optional(),
    mentions: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        userName: zod_1.z.string(),
        position: zod_1.z.number()
    })).optional()
});
exports.CommentThreadSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    projectId: zod_1.z.string().optional(),
    resourceType: zod_1.z.string(), // 'entity', 'analysis', 'document', 'map', etc.
    resourceId: zod_1.z.string(),
    anchorType: zod_1.z.enum(['text', 'element', 'coordinate', 'global']),
    anchor: zod_1.z.object({
        // Text selection
        textPosition: zod_1.z.object({
            start: zod_1.z.number(),
            end: zod_1.z.number(),
            text: zod_1.z.string()
        }).optional(),
        // Element reference
        elementId: zod_1.z.string().optional(),
        elementPath: zod_1.z.string().optional(),
        // Coordinate (for maps/graphs)
        coordinates: zod_1.z.object({
            x: zod_1.z.number(),
            y: zod_1.z.number(),
            z: zod_1.z.number().optional()
        }).optional(),
        // Additional context
        context: zod_1.z.record(zod_1.z.any()).optional()
    }),
    status: zod_1.z.nativeEnum(CommentStatus).default(CommentStatus.OPEN),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    resolvedBy: zod_1.z.string().optional(),
    resolvedAt: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.CommentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    threadId: zod_1.z.string(),
    authorId: zod_1.z.string(),
    content: zod_1.z.array(exports.RichTextContentSchema),
    plainText: zod_1.z.string(), // for search
    attachments: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        type: zod_1.z.string(),
        size: zod_1.z.number(),
        url: zod_1.z.string(),
        thumbnailUrl: zod_1.z.string().optional()
    })).default([]),
    mentions: zod_1.z.array(zod_1.z.string()).default([]),
    isEdited: zod_1.z.boolean().default(false),
    editedAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date(),
    parentCommentId: zod_1.z.string().optional() // for nested replies
});
exports.CommentReactionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    commentId: zod_1.z.string(),
    userId: zod_1.z.string(),
    type: zod_1.z.nativeEnum(ReactionType),
    createdAt: zod_1.z.date()
});
exports.AnnotationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    resourceType: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    layerId: zod_1.z.string().optional(), // for grouping annotations
    type: zod_1.z.nativeEnum(AnnotationType),
    geometry: zod_1.z.object({
        // For shapes
        x: zod_1.z.number().optional(),
        y: zod_1.z.number().optional(),
        width: zod_1.z.number().optional(),
        height: zod_1.z.number().optional(),
        // For paths/freehand
        path: zod_1.z.array(zod_1.z.object({
            x: zod_1.z.number(),
            y: zod_1.z.number()
        })).optional(),
        // For circles
        radius: zod_1.z.number().optional(),
        // Transform
        rotation: zod_1.z.number().optional(),
        scale: zod_1.z.number().optional()
    }),
    style: zod_1.z.object({
        color: zod_1.z.string().default('#FFFF00'),
        opacity: zod_1.z.number().default(0.5),
        strokeWidth: zod_1.z.number().optional(),
        strokeColor: zod_1.z.string().optional(),
        fillColor: zod_1.z.string().optional(),
        fontSize: zod_1.z.number().optional(),
        fontFamily: zod_1.z.string().optional()
    }).default({}),
    content: zod_1.z.string().optional(), // for text annotations
    linkedCommentId: zod_1.z.string().optional(),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.AnnotationLayerSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    isVisible: zod_1.z.boolean().default(true),
    isLocked: zod_1.z.boolean().default(false),
    opacity: zod_1.z.number().default(1.0),
    order: zod_1.z.number(), // z-index
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date()
});
exports.CommentVoteSchema = zod_1.z.object({
    id: zod_1.z.string(),
    commentId: zod_1.z.string(),
    userId: zod_1.z.string(),
    value: zod_1.z.number(), // +1 for upvote, -1 for downvote
    createdAt: zod_1.z.date()
});
exports.CommentNotificationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    commentId: zod_1.z.string(),
    threadId: zod_1.z.string(),
    type: zod_1.z.enum(['mention', 'reply', 'reaction', 'resolution', 'assignment']),
    read: zod_1.z.boolean().default(false),
    readAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date()
});
