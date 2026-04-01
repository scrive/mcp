import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { JourneyClient } from "../scrive/journey/client.js";
import type {
  JourneyActionKind,
  JourneyConfirmationMethod,
  JourneyDocument,
  JourneyInvitationMethod,
  JourneyParticipant,
  JourneyStep,
} from "../scrive/journey/types.js";

export const addParticipantToDraftConfig = {
  description: "Adds a participant to an existing Journey flow draft",
  inputSchema: z.object({
    draft_id: z.string(),
    name: z.string(),
    email: z.string(),
    action: z.enum(["sign", "view", "approve", "receive_copy"]).optional(),
    invitation_method: z
      .enum(["email", "sms", "email_and_sms", "link_only", "kivra", "eboks", "eboks_private"])
      .optional(),
    confirmation_method: z
      .enum(["email", "sms", "email_and_sms", "none", "kivra", "eboks", "eboks_private"])
      .optional(),
  }),
};

export interface AddParticipantToDraftArgs {
  draft_id: string;
  name: string;
  email: string;
  action?: JourneyActionKind;
  invitation_method?: JourneyInvitationMethod;
  confirmation_method?: JourneyConfirmationMethod;
}

export function addParticipantToDraftHandler(client: JourneyClient) {
  return async (args: AddParticipantToDraftArgs) => {
    const action = normalizeActionKind(args.action);
    const invitationMethod = normalizeInvitationMethod(args.invitation_method);
    const confirmationMethod = normalizeConfirmationMethod(args.confirmation_method);

    try {
      const draft = await client.getFlowDraft(args.draft_id);
      const existingParticipants = Array.isArray(draft.participants) ? draft.participants : [];
      const existingSteps = Array.isArray(draft.steps) ? draft.steps : [];
      const documentIds = extractDocumentIds(draft.documents);

      const participant = buildParticipant(
        args.name,
        args.email,
        action,
        invitationMethod,
        confirmationMethod,
      );
      const participantId = participant.association_id;
      const participants = [
        ...enrichParticipantsWithActions(existingParticipants, existingSteps),
        participant,
      ];
      const steps = generateSteps(participants, documentIds);
      const cleanedParticipants = stripActionMetadata(participants);

      await client.updateFlowDraft(args.draft_id, {
        participants: cleanedParticipants,
        steps,
      });

      return {
        isError: false,
        content: [
          {
            type: "text" as const,
            text: `Participant '${args.name}' (${args.email}) added to draft with ID: ${participantId} and action: ${action}.`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          { type: "text" as const, text: error instanceof Error ? error.message : String(error) },
        ],
      };
    }
  };
}

type Participant = JourneyParticipant & {
  association_id: string;
  _action?: JourneyActionKind;
};

function buildParticipant(
  name: string,
  email: string,
  action: JourneyActionKind,
  invitationMethod: JourneyInvitationMethod,
  confirmationMethod: JourneyConfirmationMethod,
): Participant {
  const [firstName, ...rest] = name.split(" ");
  const lastName = rest.join(" ");

  return {
    association_id: randomUUID(),
    invitation_method: invitationMethod,
    confirmation_method: confirmationMethod,
    fields: [
      {
        type: "name",
        order: 1,
        id: randomUUID(),
        is_obligatory: false,
        should_be_filled_by_sender: false,
        placements: [],
        value: firstName,
      },
      {
        type: "name",
        order: 2,
        id: randomUUID(),
        is_obligatory: false,
        should_be_filled_by_sender: false,
        placements: [],
        value: lastName,
      },
      {
        type: "email",
        id: randomUUID(),
        is_obligatory: true,
        should_be_filled_by_sender: true,
        is_editable_by_signatory: false,
        placements: [],
        value: email,
      },
    ],
    _action: action,
  };
}

function enrichParticipantsWithActions(
  participants: JourneyParticipant[],
  steps: JourneyStep[],
): Participant[] {
  const actionMap = buildActionMap(steps);

  return participants.map((participant) => ({
    ...participant,
    association_id: String(participant.association_id),
    _action: actionMap.get(String(participant.association_id)) ?? "sign",
  }));
}

function buildActionMap(steps: JourneyStep[]): Map<string, JourneyActionKind> {
  const result = new Map<string, JourneyActionKind>();

  for (const step of steps) {
    if (!Array.isArray(step.actions)) {
      continue;
    }

    for (const action of step.actions) {
      const participantId = typeof action.participant_id === "string" ? action.participant_id : "";
      const kind = action.kind;
      if (participantId && kind && !result.has(participantId)) {
        result.set(participantId, kind);
      }
    }
  }

  return result;
}

function extractDocumentIds(documents: JourneyDocument[] | undefined): string[] {
  if (!documents) {
    return [];
  }

  return documents.flatMap((document) => (document.id ? [document.id] : []));
}

function generateSteps(participants: Participant[], documentIds: string[]) {
  if (documentIds.length === 0) {
    return [];
  }

  const groups = new Map<JourneyActionKind, string[]>();
  for (const participant of participants) {
    const action = participant._action;
    if (!action) {
      continue;
    }

    const existing = groups.get(action) ?? [];
    existing.push(participant.association_id);
    groups.set(action, existing);
  }

  return Array.from(groups.entries()).map(([action, participantIds]) => ({
    actions: participantIds.flatMap((participantId) =>
      documentIds.map((documentId) => ({
        kind: action,
        participant_id: participantId,
        document_id: documentId,
        ...(action === "sign" ? { purpose: "sign" } : {}),
      })),
    ),
  }));
}

function stripActionMetadata(participants: Participant[]) {
  return participants.map(({ _action, ...participant }) => participant);
}

function normalizeActionKind(value?: string): JourneyActionKind {
  switch (value) {
    case "view":
    case "approve":
    case "receive_copy":
    case "sign":
      return value;
    default:
      return "sign";
  }
}

function normalizeInvitationMethod(value?: string): JourneyInvitationMethod {
  switch (value) {
    case "sms":
    case "email_and_sms":
    case "link_only":
    case "kivra":
    case "eboks":
    case "eboks_private":
    case "email":
      return value;
    default:
      return "email";
  }
}

function normalizeConfirmationMethod(value?: string): JourneyConfirmationMethod {
  switch (value) {
    case "sms":
    case "email_and_sms":
    case "none":
    case "kivra":
    case "eboks":
    case "eboks_private":
    case "email":
      return value;
    default:
      return "email";
  }
}
