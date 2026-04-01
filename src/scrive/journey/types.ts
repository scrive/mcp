export interface JourneyDocument {
  id: string;
}

export type JourneyActionKind = "sign" | "view" | "approve" | "receive_copy";
export type JourneyInvitationMethod =
  | "email"
  | "sms"
  | "email_and_sms"
  | "link_only"
  | "kivra"
  | "eboks"
  | "eboks_private";
export type JourneyConfirmationMethod =
  | "email"
  | "sms"
  | "email_and_sms"
  | "none"
  | "kivra"
  | "eboks"
  | "eboks_private";

export interface JourneyAction {
  kind: JourneyActionKind;
  participant_id?: string;
  document_id: string;
  purpose?: string;
}

export interface JourneyStep {
  actions: JourneyAction[];
}

export interface JourneyFieldPlacement {}

export interface JourneyField {
  type: string;
  id?: string;
  order?: number;
  is_obligatory?: boolean;
  should_be_filled_by_sender?: boolean;
  placements: JourneyFieldPlacement[];
  value?: string;
  is_editable_by_signatory?: boolean;
}

export interface JourneyParticipant {
  association_id: string;
  invitation_method: JourneyInvitationMethod;
  confirmation_method: JourneyConfirmationMethod;
  fields: JourneyField[];
}

export interface JourneyGroup {
  id: string;
  name: string;
  participant_ids?: string[];
  group_ids?: string[];
  required_actions?: number;
}

export interface JourneyDocumentTag {
  name: string;
  value: string;
}

export interface JourneyDuration {
  days: number;
}

export interface JourneyDraft {
  id: string;
  process_title: string;
  created: string;
  updated: string;
  author_id: string;
  participants: JourneyParticipant[];
  groups: JourneyGroup[];
  documents: JourneyDocument[];
  attachments: unknown[];
  requested_attachments: unknown[];
  steps: JourneyStep[];
  language: string;
  duration: JourneyDuration;
  document_tags: JourneyDocumentTag[];
  document_rejections: string;
  flow_rejections: boolean;
  use_forms: boolean;
  callback?: unknown;
}

export interface JourneyStartFlowResponse {
  flow_id: string;
}
