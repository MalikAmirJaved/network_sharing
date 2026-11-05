"use client";

import {
  ArrowDown,
  Inbox,
  Loader2,
  MessageSquareText,
  Paperclip,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ItemCard } from "@/components/room/item-card";
import { dayKey, dayLabel } from "@/lib/client/format";
import type { RoomItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "text" | "url" | "file" | "mine";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "text", label: "Notes" },
  { value: "url", label: "Links" },
  { value: "file", label: "Files" },
  { value: "mine", label: "Mine" },
];

export function Feed({
  items,
  meId,
  nextCursor,
  loadingMore,
  onLoadMore,
  onPreview,
  onDelete,
  newIds,
}: {
  items: RoomItem[];
  meId: string;
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => void;
  onPreview: (item: RoomItem) => void;
  onDelete: (item: RoomItem) => void;
  newIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "mine" && item.createdBy !== meId) return false;
      if (filter !== "all" && filter !== "mine" && item.kind !== filter) {
        return false;
      }
      if (!search) return true;
      const haystack = [
        item.content,
        item.title,
        item.fileName,
        item.authorName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [items, filter, meId, query]);

  const groups = useMemo(() => {
    const result: { key: string; label: string; items: RoomItem[] }[] = [];
    for (const item of visible) {
      const key = dayKey(item.createdAt);
      const last = result[result.length - 1];
      if (last && last.key === key) {
        last.items.push(item);
      } else {
        result.push({
          key,
          label: dayLabel(item.createdAt),
          items: [item],
        });
      }
    }
    return result;
  }, [visible]);

  const isFiltered = filter !== "all" || query.trim().length > 0;

  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this room…"
            className="field h-9 py-0 pl-9 pr-8 text-xs"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint hover:text-fg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1.5 text-[0.7rem] font-semibold transition-colors",
                filter === option.value
                  ? "bg-fg/8 text-fg"
                  : "text-muted hover:bg-fg/5 hover:text-fg",
              )}
            >
              {option.label}
            </button>
          ))}
          <span className="ml-1 shrink-0 text-[0.65rem] tabular-nums text-faint">
            {visible.length}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="surface-card rounded-2xl border-dashed p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-accent-2/15 text-accent ring-1 ring-accent/20">
            <Inbox className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            This room is empty
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
            Drop a file anywhere on the page, paste a screenshot, or send a note
            to get things started.
          </p>
          <div className="mx-auto mt-6 grid max-w-md gap-2 sm:grid-cols-3">
            {[
              { icon: Paperclip, label: "Drop files" },
              { icon: MessageSquareText, label: "Paste text" },
              { icon: ArrowDown, label: "Share a link" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-bg-soft/40 px-3 py-3 text-[0.68rem] font-medium text-muted"
              >
                <Icon className="h-4 w-4 text-faint" />
                {label}
              </div>
            ))}
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="surface-card rounded-2xl p-10 text-center">
          <Search className="mx-auto h-6 w-6 text-faint" />
          <p className="mt-3 text-sm font-semibold">No matches</p>
          <p className="mt-1 text-xs text-muted">
            Try a different search or filter.
          </p>
          {isFiltered ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="mt-3 text-xs font-semibold text-accent hover:text-accent-2"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 flex items-center gap-3">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-faint">
                  {group.label}
                </span>
                <span className="hairline flex-1" />
              </div>
              <div className="space-y-2.5">
                {group.items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    meId={meId}
                    isNew={newIds.has(item.id)}
                    onPreview={onPreview}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          ))}

          {nextCursor ? (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="btn btn-ghost h-9 px-4 text-xs"
              >
                {loadingMore ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                )}
                {loadingMore ? "Loading…" : "Load older items"}
              </button>
            </div>
          ) : items.length > 0 ? (
            <p className="pt-1 text-center text-[0.65rem] text-faint">
              That&apos;s everything in this room.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
