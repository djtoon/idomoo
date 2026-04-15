const config = require('./config');

class IdomooError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'IdomooError';
    this.status = status;
    this.body = body;
  }
}

class IdomooClient {
  constructor(cfg = config.load()) {
    if (!cfg.account_id || !cfg.api_key) {
      throw new IdomooError(
        'Missing credentials. Run `idomoo login` to set your account ID and API key.'
      );
    }
    this.cfg = cfg;
  }

  get authUrl() {
    return this.cfg.auth_url || config.DEFAULTS.auth_url;
  }

  get apiUrl() {
    return (this.cfg.api_url || config.DEFAULTS.api_url).replace(/\/+$/, '');
  }

  async getToken({ force = false } = {}) {
    const now = Math.floor(Date.now() / 1000);
    const cached = this.cfg.token;
    if (!force && cached && cached.access_token && cached.expires_at && cached.expires_at - 60 > now) {
      return cached.access_token;
    }

    const basic = Buffer.from(`${this.cfg.account_id}:${this.cfg.api_key}`).toString('base64');
    const res = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {
      data = { raw: text };
    }

    if (!res.ok) {
      throw new IdomooError(
        `Token request failed (${res.status}): ${text || res.statusText}`,
        { status: res.status, body: data }
      );
    }

    const expiresIn = Number(data.expires_in) || 1800;
    const token = {
      access_token: data.access_token,
      token_type: data.token_type || 'Bearer',
      expires_at: now + expiresIn,
    };

    this.cfg = config.update({ token });
    return token.access_token;
  }

  async request(method, path, { body, query, retry = true } = {}) {
    const token = await this.getToken();
    let url = `${this.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
    if (query && Object.keys(query).length > 0) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        qs.set(k, String(v));
      }
      const s = qs.toString();
      if (s) url += `?${s}`;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
    const init = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);

    // Token could have been revoked — retry once with a fresh token.
    if (res.status === 401 && retry) {
      await this.getToken({ force: true });
      return this.request(method, path, { body, query, retry: false });
    }

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = { raw: text };
    }

    if (!res.ok) {
      const detail = data && data.detail ? JSON.stringify(data.detail) : (text || res.statusText);
      throw new IdomooError(
        `${method} ${path} failed (${res.status}): ${detail}`,
        { status: res.status, body: data }
      );
    }

    return data;
  }

  // ---- Brief ----
  createBrief(payload) {
    return this.request('POST', '/brief', { body: payload });
  }
  getBrief(id) {
    return this.request('GET', `/brief/${encodeURIComponent(id)}`);
  }

  // ---- Blueprint ----
  createBlueprint(payload) {
    return this.request('POST', '/blueprint', { body: payload });
  }
  getBlueprint(id) {
    return this.request('GET', `/blueprint/${encodeURIComponent(id)}`);
  }

  // ---- AI Video ----
  createAiVideo(payload) {
    return this.request('POST', '/ai-video', { body: payload });
  }
  getAiVideo(id) {
    return this.request('GET', `/ai-video/${encodeURIComponent(id)}`);
  }

  // ---- Brand ----
  createBrand(payload) {
    return this.request('POST', '/brands', { body: payload });
  }
  getBrand(id) {
    return this.request('GET', `/brands/${encodeURIComponent(id)}`);
  }
  updateBrand(id, payload) {
    return this.request('PUT', `/brands/${encodeURIComponent(id)}`, { body: payload });
  }
}

// Poll a getter function until its Status field leaves "In process"/"Waiting for a file".
async function pollUntilDone(getter, { intervalMs = 4000, timeoutMs = 10 * 60 * 1000, onTick } = {}) {
  const start = Date.now();
  while (true) {
    const data = await getter();
    if (onTick) onTick(data);
    const status = data && data.status;
    if (status === 'Done') return data;
    if (status === 'Error') {
      throw new IdomooError(
        `Processing failed: ${data.status_message || 'unknown error'}`,
        { body: data }
      );
    }
    if (Date.now() - start > timeoutMs) {
      throw new IdomooError(`Timed out after ${Math.round(timeoutMs / 1000)}s (last status: ${status})`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

module.exports = { IdomooClient, IdomooError, pollUntilDone };
