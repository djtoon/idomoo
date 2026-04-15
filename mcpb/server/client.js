// Minimal Idomoo API client: OAuth2 client-credentials flow with bearer-token
// caching + auto-refresh on 401. Uses native fetch (Node 18+).

const DEFAULT_AUTH_URL = "https://usa-api.idomoo.com/api/v3/oauth/token";
const DEFAULT_API_URL = "https://api-ai.idomoo.com";

export class IdomooError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "IdomooError";
    this.status = status;
    this.body = body;
  }
}

export class IdomooClient {
  constructor({ accountId, apiKey, authUrl, apiUrl } = {}) {
    this.accountId = accountId || process.env.IDOMOO_ACCOUNT_ID;
    this.apiKey = apiKey || process.env.IDOMOO_API_KEY;
    this.authUrl = authUrl || process.env.IDOMOO_AUTH_URL || DEFAULT_AUTH_URL;
    this.apiUrl = (apiUrl || process.env.IDOMOO_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");
    if (!this.accountId || !this.apiKey) {
      throw new IdomooError(
        "Missing Idomoo credentials. Configure Account ID and API Secret Key in the extension settings."
      );
    }
    this._token = null;
  }

  async getToken({ force = false } = {}) {
    const now = Math.floor(Date.now() / 1000);
    if (!force && this._token && this._token.expires_at - 60 > now) {
      return this._token.access_token;
    }
    const basic = Buffer.from(`${this.accountId}:${this.apiKey}`).toString("base64");
    const res = await fetch(this.authUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) {
      throw new IdomooError(`Token request failed (${res.status}): ${text || res.statusText}`, {
        status: res.status, body: data,
      });
    }
    const expiresIn = Number(data.expires_in) || 1800;
    this._token = {
      access_token: data.access_token,
      token_type: data.token_type || "Bearer",
      expires_at: now + expiresIn,
    };
    return this._token.access_token;
  }

  async request(method, path, { body, retry = true } = {}) {
    const token = await this.getToken();
    const url = `${this.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    const init = { method, headers };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    if (res.status === 401 && retry) {
      await this.getToken({ force: true });
      return this.request(method, path, { body, retry: false });
    }
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      const detail = data && data.detail ? JSON.stringify(data.detail) : (text || res.statusText);
      throw new IdomooError(`${method} ${path} failed (${res.status}): ${detail}`, {
        status: res.status, body: data,
      });
    }
    return data;
  }

  // ---- Brief ----
  createBrief(payload) { return this.request("POST", "/brief", { body: payload }); }
  getBrief(id) { return this.request("GET", `/brief/${encodeURIComponent(id)}`); }
  patchBrief(id, payload) { return this.request("PATCH", `/brief/${encodeURIComponent(id)}`, { body: payload }); }
  updateBriefByPrompt(briefId, userPrompt) {
    return this.request("POST", "/brief/update", { body: { brief_id: briefId, user_prompt: userPrompt } });
  }

  // ---- Blueprint ----
  createBlueprint(payload) { return this.request("POST", "/blueprint", { body: payload }); }
  getBlueprint(id) { return this.request("GET", `/blueprint/${encodeURIComponent(id)}`); }
  updateBlueprintByPrompt(id, prompt) {
    return this.request("POST", `/blueprint/${encodeURIComponent(id)}`, { body: { prompt } });
  }

  // ---- AI Video ----
  createAiVideo(payload) { return this.request("POST", "/ai-video", { body: payload }); }
  getAiVideo(id) { return this.request("GET", `/ai-video/${encodeURIComponent(id)}`); }
  saveAiVideo(payload) { return this.request("POST", "/ai-video/save", { body: payload }); }

  // ---- Brand ----
  createBrand(payload) { return this.request("POST", "/brands", { body: payload }); }
  getBrand(id) { return this.request("GET", `/brands/${encodeURIComponent(id)}`); }
  updateBrand(id, payload) { return this.request("PUT", `/brands/${encodeURIComponent(id)}`, { body: payload }); }
  searchBrands(name = "") { return this.request("POST", "/brands/search", { body: { name } }); }
}
