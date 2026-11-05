export type ItemKind = "text" | "url" | "file";

export interface RoomItem {
  id: string;
  kind: ItemKind;
  content?: string;
  title?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: number;
  createdBy: string;
  authorName: string;
  canDelete: boolean;
}

export interface RoomMember {
  deviceId: string;
  name: string;
  online: boolean;
  isOwner: boolean;
  isYou: boolean;
  lastSeenAt: number;
}

export interface RoomSummary {
  id: string;
  code: string;
  name: string;
  createdAt: number;
  expiresAt: number | null;
  isOwner: boolean;
  hasPin: boolean;
  usageBytes: number;
  fileCount: number;
}

export interface RoomInfo extends RoomSummary {
  items: RoomItem[];
  members: RoomMember[];
  nextCursor: string | null;
}

export interface PresenceMember {
  deviceId: string;
  name: string;
  online: boolean;
}

export interface SystemInfo {
  version: string;
  lanUrls: string[];
  limits: {
    maxUploadBytes: number;
    roomQuotaBytes: number;
    textMaxChars: number;
    roomTtlHours: number;
  };
}

export interface ApiErrorBody {
  error: string;
  message?: string;
  requiresPin?: boolean;
}
