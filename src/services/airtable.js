const AIRTABLE_TOKEN = 'patSpvZSpM9xeyBz4.359c3eb2a6bfec24a2b7ee4282a7dceb1241f58de43962bf6977b3c83b49d757';

let cachedBaseId = 'app4HGV3n009Kt27v';

export function setCustomBaseId(baseId) {
  if (baseId) {
    cachedBaseId = baseId.trim();
  }
}

export function getCustomBaseId() {
  return cachedBaseId;
}

export async function getBaseId() {
  if (cachedBaseId) return cachedBaseId;

  try {
    const response = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.bases && data.bases.length > 0) {
        cachedBaseId = data.bases[0].id;
        return cachedBaseId;
      }
    }
  } catch (e) {
    console.warn('Could not auto-discover Airtable base via meta API:', e);
  }

  return cachedBaseId;
}

async function airtableFetch(endpoint, options = {}) {
  const baseId = await getBaseId();

  if (!baseId) {
    throw new Error('Airtable Base ID is required. Please set your Base ID (starts with "app...") in Settings.');
  }

  const url = `https://api.airtable.com/v0/${baseId}/${endpoint}`;

  const headers = {
    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 403) {
      throw new Error(`Airtable Permission Error (403): Please check that your token has access to Base "${baseId}" and data.records:read/write scope.`);
    }
    throw new Error(`Airtable API error (${response.status}): ${errText}`);
  }

  return response.json();
}

// Fetch users from Airtable 'users' table
export async function fetchUsers() {
  try {
    const data = await airtableFetch('users');
    return (data.records || []).map((record) => ({
      recordId: record.id,
      id: record.fields.id !== undefined ? record.fields.id : record.id,
      name: record.fields.name || 'Unnamed',
      pin: record.fields.pin ? String(record.fields.pin) : '1234',
      role: Number(record.fields.role) || 3,
      creation: record.fields.creation || new Date().toISOString(),
      edited: record.fields.edited || new Date().toISOString(),
      last_login: record.fields.last_login || null,
      last_action: record.fields.last_action || null,
      rate: Number(record.fields.rate) || 0,
      half_rate: Number(record.fields.half_rate) || 0,
      extra_rate: Number(record.fields.extra_rate) || 0,
    }));
  } catch (error) {
    console.error('Failed to fetch users from Airtable:', error.message);
    throw error;
  }
}

// Fetch logs from Airtable 'logs' table
export async function fetchLogs() {
  try {
    const data = await airtableFetch('logs');
    return (data.records || []).map((record) => ({
      recordId: record.id,
      datetime: record.fields.datetime || new Date().toISOString(),
      type: record.fields.type || 'Out',
      user_id: record.fields.user_id,
    }));
  } catch (error) {
    console.error('Failed to fetch logs from Airtable:', error.message);
    return [];
  }
}

// Create a new user in Airtable 'users' table
export async function createUserInAirtable({
  name,
  pin = '1234',
  role = 3,
  rate = 0,
  half_rate = 0,
  extra_rate = 0,
}) {
  const now = new Date().toISOString();
  const roleStr = String(role); // "2" for Super Crew, "3" for Crew

  const fields = {
    name,
    pin: String(pin),
    role: roleStr,
    creation: now,
    edited: now,
    rate: Number(rate) || 0,
    half_rate: Number(half_rate) || 0,
    extra_rate: Number(extra_rate) || 0,
  };

  const data = await airtableFetch('users', {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  return {
    recordId: data.id,
    id: data.fields.id !== undefined ? data.fields.id : data.id,
    name: data.fields.name || name,
    pin: data.fields.pin ? String(data.fields.pin) : String(pin),
    role: Number(data.fields.role) || Number(roleStr),
    creation: data.fields.creation || now,
    edited: data.fields.edited || now,
    last_login: data.fields.last_login || null,
    last_action: data.fields.last_action || null,
    rate: Number(data.fields.rate) !== undefined ? Number(data.fields.rate) : Number(rate),
    half_rate: Number(data.fields.half_rate) !== undefined ? Number(data.fields.half_rate) : Number(half_rate),
    extra_rate: Number(data.fields.extra_rate) !== undefined ? Number(data.fields.extra_rate) : Number(extra_rate),
  };
}

// Update a user in Airtable 'users' table
export async function updateUserInAirtable(
  recordId,
  { name, pin, role, last_login, last_action, rate, half_rate, extra_rate }
) {
  const now = new Date().toISOString();
  const fields = {
    edited: now,
  };
  if (name !== undefined) fields.name = name;
  if (pin !== undefined) fields.pin = String(pin);
  if (role !== undefined) fields.role = String(role);
  if (last_login !== undefined) fields.last_login = last_login;
  if (last_action !== undefined) fields.last_action = last_action;
  if (rate !== undefined) fields.rate = Number(rate);
  if (half_rate !== undefined) fields.half_rate = Number(half_rate);
  if (extra_rate !== undefined) fields.extra_rate = Number(extra_rate);

  const data = await airtableFetch(`users/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });

  return data;
}

// Delete a user from Airtable 'users' table
export async function deleteUserFromAirtable(recordId) {
  const data = await airtableFetch(`users/${recordId}`, {
    method: 'DELETE',
  });
  return data;
}

// Create a log entry in Airtable 'logs' table
export async function createLogInAirtable({ datetime, type, user_id, recordId }) {
  let userIdArray = [];

  const targetRecordId = (recordId && String(recordId).startsWith('rec'))
    ? recordId
    : (typeof user_id === 'string' && user_id.startsWith('rec'))
    ? user_id
    : null;

  if (targetRecordId) {
    userIdArray = [targetRecordId];
  } else if (Array.isArray(user_id)) {
    userIdArray = user_id;
  } else if (user_id !== undefined && user_id !== null) {
    userIdArray = [user_id];
  }

  // Format type strictly as "In" or "Out"
  const formattedType = (type && String(type).toLowerCase() === 'in') ? 'In' : 'Out';

  const fields = {
    datetime: datetime || new Date().toISOString(),
    type: formattedType, // "In" or "Out"
    user_id: userIdArray,
  };

  const data = await airtableFetch('logs', {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  return data;
}
