/**
 * Knowledge Base System - Type Definitions
 */

export interface KBArticle {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  authorId?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  metaDescription?: string;
  keywords?: string[];
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  isPublic: boolean;
  isInternal: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface KBArticleVersion {
  id: string;
  articleId: string;
  version: number;
  title: string;
  content: string;
  changedBy?: string;
  changeNote?: string;
  createdAt: Date;
}

export interface KBFAQ {
  id: string;
  tenantId: string;
  question: string;
  answer: string;
  category?: string;
  orderIndex: number;
  isFeatured: boolean;
  viewCount: number;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface KBTutorial {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration?: number;
  content?: string;
  videoUrl?: string;
  category?: string;
  tags?: string[];
  prerequisites?: string[];
  learningOutcomes?: string[];
  viewCount: number;
  completionCount: number;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateArticleInput {
  tenantId: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  authorId?: string;
  isPublic?: boolean;
  isInternal?: boolean;
  metaDescription?: string;
  keywords?: string[];
}

export interface UpdateArticleInput {
  title?: string;
  content?: string;
  excerpt?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
  isPublic?: boolean;
  isInternal?: boolean;
  metaDescription?: string;
  keywords?: string[];
}

export interface SearchArticlesInput {
  tenantId?: string;
  query?: string;
  category?: string;
  tags?: string[];
  status?: string[];
  isPublic?: boolean;
  limit?: number;
  offset?: number;
}

export interface ArticleAnalytics {
  articleId: string;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulnessRatio: number;
  averageTimeOnPage?: number;
  bounceRate?: number;
}

export interface KBMetrics {
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  averageHelpfulnessRatio: number;
  topArticles: Array<{
    id: string;
    title: string;
    viewCount: number;
    helpfulnessRatio: number;
  }>;
  popularCategories: Array<{
    category: string;
    articleCount: number;
    viewCount: number;
  }>;
}
