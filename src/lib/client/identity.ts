const NAME_KEY = "netword-name";
const RECENT_KEY = "netword-recent-rooms";

const adjectives = [
  "Amber",
  "Blue",
  "Bold",
  "Brave",
  "Bright",
  "Calm",
  "Clever",
  "Cosmic",
  "Crimson",
  "Crystal",
  "Daring",
  "Dusty",
  "Eager",
  "Electric",
  "Fuzzy",
  "Gentle",
  "Golden",
  "Happy",
  "Hidden",
  "Jade",
  "Lively",
  "Lucky",
  "Lunar",
  "Mellow",
  "Misty",
  "Nimble",
  "Nova",
  "Olive",
  "Quiet",
  "Rapid",
  "Silver",
  "Solar",
  "Sunny",
  "Swift",
  "Tiny",
  "Velvet",
  "Vivid",
  "Warm",
  "Wild",
  "Witty",
];

const animals = [
  "Badger",
  "Bear",
  "Bison",
  "Cat",
  "Cobra",
  "Crane",
  "Dolphin",
  "Eagle",
  "Fox",
  "Gecko",
  "Heron",
  "Ibex",
  "Koala",
  "Lemur",
  "Lynx",
  "Moose",
  "Otter",
  "Owl",
  "Panda",
  "Puma",
  "Rabbit",
  "Raven",
  "Seal",
  "Shark",
  "Sloth",
  "Sparrow",
  "Squid",
  "Tiger",
  "Toucan",
  "Turtle",
  "Whale",
  "Wolf",
  "Wombat",
  "Yak",
  "Zebra",
];

export function generateName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]!;
  const animal = animals[Math.floor(Math.random() * animals.length)]!;
  return `${adjective} ${animal}`;
}

export function loadName(): string {
  if (typeof window === "undefined") return "Guest";
  try {
    const stored = localStorage.getItem(NAME_KEY);
    if (stored && stored.trim()) return stored.trim().slice(0, 32);
  } catch {
    // ignore storage errors
  }
  const generated = generateName();
  saveName(generated);
  return generated;
}

export function saveName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NAME_KEY, name.trim().slice(0, 32));
  } catch {
    // ignore storage errors
  }
}

export interface RecentRoom {
  code: string;
  name: string;
  seenAt: number;
}

export function loadRecentRooms(): RecentRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentRoom[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (room) =>
          room &&
          typeof room.code === "string" &&
          typeof room.name === "string",
      )
      .slice(0, 4);
  } catch {
    return [];
  }
}

export function rememberRoom(room: { code: string; name: string }): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadRecentRooms().filter(
      (entry) => entry.code !== room.code,
    );
    const next: RecentRoom[] = [
      { code: room.code, name: room.name, seenAt: Date.now() },
      ...existing,
    ].slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}
