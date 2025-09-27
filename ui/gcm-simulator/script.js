class BrowserGCMClient {
  constructor({ baseUrl, apiKey }) {
    if (!baseUrl) {
      throw new Error('baseUrl is required');
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async submitJob(request) {
    return this.#request('/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getManifest(accountId) {
    if (!accountId) {
      throw new Error('accountId is required');
    }
    return this.#request(`/api/v1/accounts/${encodeURIComponent(accountId)}/manifest`);
  }

  async submitProviderUsage(report) {
    await this.#request('/api/v1/provider-usage', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  async getReconciliation(accountId) {
    if (!accountId) {
      throw new Error('accountId is required');
    }
    return this.#request(`/api/v1/accounts/${encodeURIComponent(accountId)}/reconciliation`);
  }

  async #request(path, init = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, init.headers || {});
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (response.ok) {
      return payload;
    }

    if (response.status === 409 && payload && payload.violation) {
      const error = new Error(payload.reason || 'Guardrail violation');
      error.violation = payload.violation;
      error.isGuardrail = true;
      throw error;
    }

    throw new Error((payload && payload.message) || `Request failed with status ${response.status}`);
  }
}

const state = {
  client: null,
};

function formatOutput(data) {
  if (!data) {
    return 'No data';
  }
  return JSON.stringify(data, null, 2);
}

function setStatus(message, tone = 'info') {
  const el = document.getElementById('connection-status');
  el.textContent = message;
  el.dataset.tone = tone;
}

function getNumberValue(id) {
  return parseFloat(document.getElementById(id).value || '0');
}

function bindActions() {
  document.getElementById('apply-config').addEventListener('click', () => {
    const baseUrl = document.getElementById('base-url').value.trim();
    const apiKey = document.getElementById('api-key').value.trim();
    try {
      state.client = new BrowserGCMClient({ baseUrl, apiKey: apiKey || undefined });
      setStatus(`Connected to ${state.client.baseUrl}`, 'success');
    } catch (error) {
      setStatus(error.message, 'error');
      state.client = null;
    }
  });

  document.getElementById('submit-job').addEventListener('click', async () => {
    const output = document.getElementById('job-output');
    if (!state.client) {
      output.textContent = 'Configure the client first.';
      return;
    }
    const request = {
      accountId: document.getElementById('job-account').value.trim(),
      policyTier: document.getElementById('job-policy').value.trim(),
      residency: document.getElementById('job-residency').value.trim(),
      usage: {
        cpuHours: getNumberValue('job-cpu'),
        storageGb: getNumberValue('job-storage'),
        egressGb: getNumberValue('job-egress'),
      },
    };
    try {
      const result = await state.client.submitJob(request);
      output.textContent = formatOutput(result);
    } catch (error) {
      if (error.isGuardrail) {
        output.textContent = `Guardrail triggered:\n${formatOutput(error.violation)}`;
      } else {
        output.textContent = error.message;
      }
    }
  });

  document.getElementById('fetch-manifest').addEventListener('click', async () => {
    const output = document.getElementById('manifest-output');
    if (!state.client) {
      output.textContent = 'Configure the client first.';
      return;
    }
    const accountId = document.getElementById('manifest-account').value.trim();
    if (!accountId) {
      output.textContent = 'Account ID is required';
      return;
    }
    try {
      const manifest = await state.client.getManifest(accountId);
      output.textContent = formatOutput(manifest);
    } catch (error) {
      output.textContent = error.message;
    }
  });

  document.getElementById('submit-provider').addEventListener('click', async () => {
    const output = document.getElementById('provider-output');
    if (!state.client) {
      output.textContent = 'Configure the client first.';
      return;
    }
    const report = {
      accountId: document.getElementById('provider-account').value.trim(),
      policyTier: document.getElementById('provider-policy').value.trim(),
      residency: document.getElementById('provider-residency').value.trim(),
      usage: {
        cpuHours: getNumberValue('provider-cpu'),
        storageGb: getNumberValue('provider-storage'),
        egressGb: getNumberValue('provider-egress'),
      },
      totalCost: getNumberValue('provider-cost'),
      currency: document.getElementById('provider-currency').value.trim(),
      reportedAt: new Date().toISOString(),
    };
    try {
      await state.client.submitProviderUsage(report);
      output.textContent = 'Provider usage accepted.';
    } catch (error) {
      output.textContent = error.message;
    }
  });

  document.getElementById('run-recon').addEventListener('click', async () => {
    const output = document.getElementById('recon-output');
    if (!state.client) {
      output.textContent = 'Configure the client first.';
      return;
    }
    const accountId = document.getElementById('recon-account').value.trim();
    if (!accountId) {
      output.textContent = 'Account ID is required';
      return;
    }
    try {
      const result = await state.client.getReconciliation(accountId);
      output.textContent = formatOutput(result);
    } catch (error) {
      output.textContent = error.message;
    }
  });
}

bindActions();
setStatus('Configure a base URL to begin.');
