import { CanonicalEntityBase, CanonicalEntityType } from '../../core/base.js';

export interface EpisodeEntity extends CanonicalEntityBase {
  type: CanonicalEntityType.EPISODE;

  properties: {
    startTime: Date;
    endTime?: Date;
    activityType: string;
    context: string;
    environment?: string;
  };
}
