export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-sync-pass, x-allow-empty-overwrite");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(404).json({ error: "KV DB is not configured on Vercel." });
  }

  const rawPass = req.headers["x-sync-pass"] || "vrc-attendance";
  const safePass = String(rawPass).replace(/[^a-zA-Z0-9_-]/g, "").trim() || "vrc-attendance";
  const key = `vrcAttendanceImageTool_${safePass}`;
  const latestBackupKey = `vrcAttendanceImageToolBackupLatest_${safePass}`;

  const parseJsonSafe = (value) => {
    if (!value || typeof value !== "string") return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const unwrapStoredData = (value) => {
    if (value && typeof value === "object" && value.data && typeof value.data === "object") {
      return value.data;
    }
    return value;
  };

  const hasMeaningfulData = (data) => {
    if (!data || typeof data !== "object") return false;
    if (data.background && data.background.dataUrl) return true;
    if (data.meta && Object.values(data.meta).some((value) => String(value || "").trim())) return true;
    if (Array.isArray(data.people) && data.people.some((person) => {
      if (!person || typeof person !== "object") return false;
      if (person.assignment && person.assignment !== "unassigned") return true;
      return ["name", "memo", "imageDataUrl"].some((keyName) => String(person[keyName] || "").trim());
    })) return true;
    return false;
  };

  const kvGet = async (targetKey) => {
    const response = await fetch(`${url}/get/${targetKey}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  };

  const kvSet = async (targetKey, payload) => {
    const response = await fetch(`${url}/set/${targetKey}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    return response.json();
  };

  if (req.method === "GET") {
    try {
      const data = await kvGet(key);
      if (data.result) {
        return res.status(200).json(unwrapStoredData(parseJsonSafe(data.result)) || {});
      }
      return res.status(200).json({});
    } catch (error) {
      return res.status(500).json({ error: "Failed to read from Vercel KV", details: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      const incomingData = req.body || {};
      const allowEmptyOverwrite = req.headers["x-allow-empty-overwrite"] === "1";

      const existingResponse = await kvGet(key);
      const existingParsed = existingResponse.result ? parseJsonSafe(existingResponse.result) : null;
      const existingData = unwrapStoredData(existingParsed) || {};

      if (!allowEmptyOverwrite && hasMeaningfulData(existingData) && !hasMeaningfulData(incomingData)) {
        return res.status(409).json({ error: "Refusing to overwrite non-empty data with empty data." });
      }

      if (existingResponse.result) {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        await kvSet(latestBackupKey, existingParsed);
        await kvSet(`vrcAttendanceImageToolBackup_${safePass}_${stamp}`, existingParsed);
      }

      const result = await kvSet(key, incomingData);
      return res.status(200).json({ success: true, result });
    } catch (error) {
      return res.status(500).json({ error: "Failed to write to Vercel KV", details: error.message });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
