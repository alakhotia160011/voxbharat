// Vobiz API client — Indian telephony provider (Plivo-like REST API)
// Used for +91 India calls and SMS, alongside Twilio for international

const BASE_URL = 'https://api.vobiz.ai/api/v1/Account';

export class VobizClient {
  constructor(authId, authToken) {
    this.authId = authId;
    this.authToken = authToken;
    this.baseUrl = `${BASE_URL}/${authId}`;
  }

  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'X-Auth-ID': this.authId,
      'X-Auth-Token': this.authToken,
      'Content-Type': 'application/json',
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Vobiz API ${method} ${path} failed (${res.status}): ${text}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /**
   * Make an outbound call.
   * Returns { request_uuid, api_id, message } on success.
   */
  async createCall({ to, from, answerUrl, answerMethod = 'POST', ringUrl, hangupUrl, record = false, machineDetection }) {
    const body = {
      from,
      to: `<${to}>`,  // Vobiz expects angle-bracket format for single numbers
      answer_url: answerUrl,
      answer_method: answerMethod,
    };

    if (ringUrl) {
      body.ring_url = ringUrl;
      body.ring_method = 'POST';
    }
    if (hangupUrl) {
      body.hangup_url = hangupUrl;
      body.hangup_method = 'POST';
    }
    if (record) {
      body.record = true;
      body.record_file_format = 'wav';
    }
    if (machineDetection) {
      body.machine_detection = machineDetection;
    }

    return this._request('POST', '/Call/', body);
  }

  /**
   * Hang up an active call.
   */
  async hangupCall(callUuid) {
    return this._request('DELETE', `/Call/${callUuid}/`);
  }

  /**
   * Send an SMS message.
   * Returns { api_id, message, message_uuid } on success.
   */
  async sendSms({ from, to, text }) {
    return this._request('POST', '/Message/', {
      src: from,
      dst: to,
      text,
    });
  }

  /**
   * Get account details (balance, etc.)
   */
  async getAccount() {
    return this._request('GET', '/');
  }
}
