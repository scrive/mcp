export type SignatoryRole = "signing_party" | "viewer" | "approver";

export type ScriveFieldType =
  | "name"
  | "full_name"
  | "email"
  | "mobile"
  | "company"
  | "personal_number"
  | "company_number"
  | "signature"
  | "checkbox"
  | "radiogroup"
  | "text"
  | "date"
  | "sign_date";

export type DocumentStatus =
  | "preparation"
  | "awaiting_start"
  | "pending"
  | "closed"
  | "canceled"
  | "timedout"
  | "rejected"
  | "document_error";

export type DeliveryMethod = "email" | "mobile" | "email_mobile" | "pad" | "api";

export type ConfirmationDeliveryMethod =
  | "email"
  | "mobile"
  | "email_mobile"
  | "email_link"
  | "email_link_mobile"
  | "none";

export type NotificationDeliveryMethod = "email" | "mobile" | "email_mobile" | "none";

export type AuthenticationMethodToView =
  | "standard"
  | "sms_pin"
  | "dk_mitid"
  | "dk_mitid_erhverv"
  | "fi_tupas"
  | "freja"
  | "freja_orgid"
  | "nl_idin"
  | "no_bankid"
  | "oneid"
  | "onfido"
  | "onfido_document_check"
  | "onfido_document_and_photo_check"
  | "se_bankid"
  | "verimi";

export type AuthenticationMethodToSign =
  | "standard"
  | "sms_pin"
  | "dk_mitid"
  | "dk_mitid_erhverv"
  | "fi_tupas"
  | "freja"
  | "freja_orgid"
  | "nl_idin"
  | "no_bankid"
  | "no_bankid_qes"
  | "oneid"
  | "onfido"
  | "onfido_document_check"
  | "onfido_document_and_photo_check"
  | "se_bankid"
  | "swisscom_qes"
  | "swisscom_qes_with_srs"
  | "verimi_qes"
  | "itsme_qes"
  | "smart_id_qes"
  | "scrive_qes"
  | "scrive_qes_global";

export type ScriveLanguage =
  | "cs"
  | "da"
  | "de"
  | "el"
  | "en"
  | "es"
  | "et"
  | "fi"
  | "fr"
  | "hu"
  | "is"
  | "it"
  | "lt"
  | "lv"
  | "nl"
  | "pl"
  | "pt"
  | "sv";

export type DocumentSortField = "title" | "status" | "mtime" | "author";
export type SortOrder = "ascending" | "descending";

export interface DocumentSortOption {
  sort_by: DocumentSortField;
  order: SortOrder;
}

export type DocumentFilter =
  | { filter_by: "status"; statuses: DocumentStatus[] }
  | { filter_by: "mtime"; start_time?: string; end_time?: string }
  | { filter_by: "tag"; name: string; value: string }
  | { has_tag: "tag"; name: string }
  | { filter_by: "is_author" }
  | { filter_by: "author"; user_id: string }
  | { filter_by: "user_can_sign"; user_id: string }
  | { filter_by: "text"; text: string }
  | { filter_by: "is_template" }
  | { filter_by: "is_not_template" }
  | { filter_by: "is_in_trash" }
  | { filter_by: "is_not_in_trash" }
  | { filter_by: "is_signable_on_pad" };

export interface ScriveFieldPlacement {
  xrel: number;
  yrel: number;
  wrel: number;
  hrel: number;
  fsrel: number;
  page: number;
  tip?: string;
  anchors?: unknown[];
}

export interface ScriveFieldCustomValidation {
  pattern: string;
  positive_example: string;
  tooltip: string;
}

export interface ScriveField {
  type: ScriveFieldType;
  value?: string | null;
  order?: number;
  name?: string;
  is_obligatory?: boolean;
  should_be_filled_by_sender?: boolean;
  editable_by_signatory?: boolean;
  placements?: ScriveFieldPlacement[];
  description?: string | null;
  signature?: string | null;
  is_checked?: boolean;
  values?: string[];
  selected_value?: string;
  custom_validation?: ScriveFieldCustomValidation | null;
  configuration?: {
    start_date: unknown;
    end_date: unknown;
  } | null;
}

export interface SignatoryAttachment {
  name: string;
  description?: string;
  required?: boolean;
  file_id?: string;
  file_name?: string;
  add_to_sealed_file?: boolean;
}

export interface HighlightedPage {
  page: number;
  file_id: string;
}

export interface SignatoryAuthentications {
  view?: { type: AuthenticationMethodToView };
  sign?: { type: AuthenticationMethodToSign };
  view_archived?: { type: AuthenticationMethodToView };
}

export interface ScriveParty {
  id?: string;
  user_id?: string | null;
  is_author?: boolean;
  is_signatory?: boolean;
  signatory_role?: SignatoryRole;
  fields?: ScriveField[];
  sign_order?: number;
  sign_time?: string | null;
  seen_time?: string | null;
  deferred_time?: string | null;
  read_invitation_time?: string | null;
  rejected_time?: string | null;
  rejection_reason?: string | null;
  sign_success_redirect_url?: string | null;
  reject_redirect_url?: string | null;
  email_delivery_status?: string;
  mobile_delivery_status?: string;
  has_authenticated_to_view?: boolean;
  csv?: string[][] | null;
  delivery_method?: DeliveryMethod;
  authentications?: SignatoryAuthentications;
  authentication_method_to_view?: AuthenticationMethodToView;
  authentication_method_to_view_archived?: AuthenticationMethodToView;
  authentication_method_to_sign?: AuthenticationMethodToSign;
  confirmation_delivery_method?: ConfirmationDeliveryMethod;
  notification_delivery_method?: NotificationDeliveryMethod;
  allows_highlighting?: boolean;
  hide_personal_number?: boolean;
  can_forward?: boolean;
  highlighted_pages?: HighlightedPage[];
  attachments?: SignatoryAttachment[];
  api_delivery_url?: string | null;
  consent_module?: unknown;
  is_visible?: boolean | null;
  document_roles?: string[];
}

export interface ScriveFileRef {
  id: string;
  name: string;
}

export interface AuthorAttachment {
  name: string;
  required?: boolean;
  add_to_sealed_file?: boolean;
  file_id?: string;
}

export interface DisplayOptions {
  show_header?: boolean;
  show_pdf_download?: boolean;
  show_reject_option?: boolean;
  allow_reject_reason?: boolean;
  show_footer?: boolean;
  document_is_receipt?: boolean;
  show_arrow?: boolean;
  show_form?: boolean;
  show_form_arrow?: boolean;
}

export interface DocumentTag {
  name: string;
  value: string;
}

export interface ScriveDocument {
  id: string;
  title?: string;
  parties?: ScriveParty[];
  file?: ScriveFileRef;
  sealed_file?: ScriveFileRef | null;
  author_attachments?: AuthorAttachment[];
  ctime?: string;
  mtime?: string;
  timeout_time?: string | null;
  auto_remind_time?: string | null;
  status?: DocumentStatus;
  days_to_sign?: number;
  days_to_remind?: number | null;
  display_options?: DisplayOptions;
  invitation_message?: string;
  sms_invitation_message?: string;
  confirmation_message?: string;
  sms_confirmation_message?: string;
  lang?: ScriveLanguage;
  api_callback_url?: string | null;
  object_version?: number;
  access_token?: string;
  date_format?: string;
  timezone?: string;
  tags?: DocumentTag[];
  is_template?: boolean;
  is_saved?: boolean;
  is_shared?: boolean;
  is_trashed?: boolean;
  is_deleted?: boolean;
  is_in_trash?: boolean;
}

export interface ListDocumentsParams {
  offset: number;
  max: number;
  filters?: DocumentFilter[];
  sorting?: DocumentSortOption[];
}

export interface ListDocumentsResponse {
  total_matching: number;
  documents: ScriveDocument[];
}
