export type LeadStatus =
  | 'new'
  | 'undecided'
  | 'added_to_huntr'
  | 'rejected'
  | 'duplicate';

export type LinkType =
  | 'job_posting'
  | 'job_list'
  | 'company'
  | 'unsubscribe'
  | 'tracking'
  | 'other';

export interface ExtractedLink {
  url: string;
  normalizedUrl: string;
  anchorText?: string;
  type: LinkType;
  domain: string;
  isLikelyJobList?: boolean;
  isUnsubscribe?: boolean;
  isTracking?: boolean;
}
