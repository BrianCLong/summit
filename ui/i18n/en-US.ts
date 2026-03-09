export const enUS = {
  agentsTitle: 'Agents',
  openCommandPalette: 'Open Command Palette (⌘K)',
  meetingStageTitle: 'Meeting Stage',
  liveWebrtcStage: 'Live WebRTC Stage',
  startLocalMeeting: 'Start Local Meeting',
  approvalsInboxTitle: 'Approvals Inbox',
  policyLabel: 'Policy: {{policy}}',
  reviewAction: 'Review',
  timelineTitle: 'Timeline',
  graphSliceTitle: 'Graph Slice: Who approved what?',
  roleLabel: 'Role: {{role}}',
  systemLabel: 'System: {{system}}',
  approvedLabel: 'Approved: {{change}}',
  copilotTitle: 'Co-pilot',
  listenAction: 'Listen',
  presentAction: 'Present',
  copilotContext:
    'Context loaded: org, agenda, metrics. Actions will be policy-checked.',
  chatWithAgentTitle: 'Chat with Agent',
  commandPlaceholder: '/call maestro | /present deck | /join room | /status api',
  startMeetingCommand: 'Start meeting',
  messageScribeCommand: 'Message Scribe',
  openGraphViewCommand: 'Open Graph View',
  messagesPlaceholder: '(messages…)',
} as const;

export type TranslationKey = keyof typeof enUS;
