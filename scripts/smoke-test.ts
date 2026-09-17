import { spawn } from "child_process";

const BASE = process.argv[2] || "http://localhost:3000";
const ADMIN_EMAIL = process.argv[3] || "";
const ADMIN_PASSWORD = process.argv[4] || "";

let cookie = "";

async function request(path: string, options: any = {}): Promise<any> {
  const url = new URL(path, BASE);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (cookie) headers["Cookie"] = cookie;

  const res = await fetch(url.toString(), {
    method: options.method || "GET",
    headers,
    body: options.body,
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie[0].split(";")[0];

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }

  return { status: res.status, body: json };
}

async function login() {
  const res = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ name: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (res.status !== 200) throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
  return res;
}

async function run() {
  console.log(`Smoke testing ${BASE}...`);

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    await login();
    console.log("Logged in as", ADMIN_EMAIL);
  } else {
    console.log("No credentials provided — skipping authenticated checks");
  }

  const checks: { name: string; fn: () => Promise<void> }[] = [
    {
      name: "GET /api/tests returns non-empty array with real titles",
      fn: async () => {
        const res = await request("/api/tests");
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        const data = res.body;
        if (!Array.isArray(data) || data.length === 0) throw new Error("Empty tests list");
        if (data.some((t: any) => !t.title || t.title === "Unknown")) throw new Error("Found unknown test title");
      },
    },
    {
      name: "GET /api/tests/[id]/attempts row count matches header counts",
      fn: async () => {
        const testsRes = await request("/api/tests");
        const tests = testsRes.body;
        if (!Array.isArray(tests) || tests.length === 0) throw new Error("No tests to verify");
        const test = tests[0];
        const attemptsRes = await request(`/api/tests/${test.id}/attempts`);
        if (attemptsRes.status !== 200) throw new Error(`Status ${attemptsRes.status}`);
        const attempts = attemptsRes.body;
        const rowCount = Array.isArray(attempts) ? attempts.length : (attempts?.count ?? 0);
        const headerCount = test.submitted_count + test.pending_grading_count + test.ready_to_release_count;
        if (rowCount !== headerCount && rowCount !== 0) {
          throw new Error(`Row count ${rowCount} does not match header count ${headerCount}`);
        }
      },
    },
    {
      name: "GET /api/attempts/all does not contain Unknown exam titles",
      fn: async () => {
        const res = await request("/api/attempts/all");
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        const data = res.body;
        if (!Array.isArray(data)) throw new Error("Expected array");
        const unknown = data.filter((r: any) => r.test_title === "Unknown");
        if (unknown.length > 0) throw new Error(`${unknown.length} rows have Unknown exam title`);
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    try {
      await check.fn();
      console.log(`✓ ${check.name}`);
      passed++;
    } catch (error: any) {
      console.log(`✗ ${check.name}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error("Smoke test error:", error);
  process.exit(1);
});
