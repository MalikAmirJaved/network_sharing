#!/usr/bin/env node
/**
 * End-to-end smoke test for Netword.
 *
 * Usage:
 *   npm run dev            # in one terminal
 *   npm run smoke          # in another
 *
 * Override the target with SMOKE_BASE_URL (defaults to http://127.0.0.1:3000).
 */

const BASE = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);

let cookie = "";
let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  if (!headers.has("origin")) headers.set("origin", BASE);

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    redirect: "manual",
  });

  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    cookie = setCookies.map((value) => value.split(";")[0]).join("; ");
  }
  return response;
}

async function json(path, init) {
  const response = await request(path, init);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function main() {
  console.log(`\nNetword smoke test → ${BASE}\n`);

  const health = await json("/api/health");
  check("GET /api/health returns ok", health.response.ok && health.body?.status === "ok");

  const system = await json("/api/system");
  check(
    "GET /api/system returns limits and LAN URLs",
    system.response.ok &&
      Array.isArray(system.body?.lanUrls) &&
      typeof system.body?.limits?.textMaxChars === "number",
  );

  const session = await json("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Smoke Bot" }),
  });
  check(
    "POST /api/session creates a signed device cookie",
    session.response.ok &&
      Boolean(cookie) &&
      session.body?.device?.name === "Smoke Bot",
  );

  const created = await json("/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Smoke room", ttlHours: 1 }),
  });
  const code = created.body?.room?.code;
  check(
    "POST /api/rooms creates a room with a 6-character code",
    created.response.status === 201 &&
      typeof code === "string" &&
      code.length === 6,
  );

  if (!code) {
    throw new Error("Room creation failed; cannot continue");
  }

  const info = await json(`/api/rooms/${code}`);
  check(
    "GET /api/rooms/:code returns the room and its owner",
    info.response.ok && info.body?.code === code && info.body?.isOwner === true,
  );

  const text = await json(`/api/rooms/${code}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "text", content: "Hello from the smoke test" }),
  });
  check(
    "POST text item is accepted",
    text.response.status === 201 && text.body?.item?.kind === "text",
  );

  const link = await json(`/api/rooms/${code}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "url",
      url: "https://example.com/docs",
      title: "Example docs",
    }),
  });
  check(
    "POST URL item is accepted",
    link.response.status === 201 &&
      link.body?.item?.content === "https://example.com/docs",
  );

  const payload = new TextEncoder().encode("netword smoke payload");
  const upload = await json(`/api/rooms/${code}/upload`, {
    method: "POST",
    headers: {
      "content-type": "text/plain",
      "x-file-name": encodeURIComponent("smoke note.txt"),
    },
    body: payload,
  });
  const fileId = upload.body?.item?.id;
  check(
    "POST upload stores a streamed file",
    upload.response.status === 201 &&
      upload.body?.item?.kind === "file" &&
      upload.body?.item?.fileSize === payload.byteLength,
  );

  if (fileId) {
    const download = await request(`/api/files/${fileId}`);
    const body = await download.text();
    check(
      "GET /api/files/:id returns the stored bytes",
      download.ok && body === "netword smoke payload",
    );

    const ranged = await request(`/api/files/${fileId}`, {
      headers: { range: "bytes=0-6" },
    });
    const rangedBody = await ranged.text();
    check(
      "Range requests return 206 partial content",
      ranged.status === 206 && rangedBody === "netword",
    );
  }

  const list = await json(`/api/rooms/${code}/items`);
  check(
    "GET items lists everything shared in the room",
    list.response.ok && list.body?.items?.length >= 3,
  );

  const deletedItem = text.body?.item?.id
    ? await json(`/api/rooms/${code}/items/${text.body.item.id}`, {
        method: "DELETE",
      })
    : null;
  check(
    "DELETE item removes it",
    deletedItem?.response.ok === true,
  );

  const deletedRoom = await json(`/api/rooms/${code}`, { method: "DELETE" });
  check("DELETE room removes it", deletedRoom.response.ok);

  const gone = await json(`/api/rooms/${code}`);
  check(
    "Deleted rooms are no longer reachable",
    gone.response.status === 404,
  );

  console.log(
    `\n${failures.length === 0 ? "PASS" : "FAIL"} — ${passed} passed, ${failures.length} failed\n`,
  );
  if (failures.length > 0) {
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\nSmoke test crashed:", error);
  process.exitCode = 1;
});
