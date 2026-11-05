import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomView } from "@/components/room/room-view";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/ids";

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  const normalized = normalizeRoomCode(code);
  return {
    title: isValidRoomCode(normalized) ? `Room ${normalized}` : "Room",
    description: "A private, realtime sharing room on your local network.",
    robots: { index: false, follow: false },
  };
}

export default async function RoomPage({ params }: PageProps) {
  const { code } = await params;
  const normalized = normalizeRoomCode(code);
  if (!isValidRoomCode(normalized)) notFound();
  return <RoomView code={normalized} />;
}
