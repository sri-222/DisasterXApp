const ESP32_BASE_URL = 'http://192.168.4.1';
const UPLOAD_ENDPOINT = `${ESP32_BASE_URL}/upload`;
const MESSAGES_ENDPOINT = `${ESP32_BASE_URL}/messages`;
const ACK_ENDPOINT = `${ESP32_BASE_URL}/ack`;

const createConnectionError = () => {
  const error = new Error('Unable to connect to DisasterX Device');
  error.code = 'ESP32_UNREACHABLE';
  return error;
};

const toUrlEncodedBody = payload =>
  Object.entries(payload)
    .map(([key, value]) => {
      const normalizedValue = value === undefined || value === null ? '' : String(value);
      return `${encodeURIComponent(key)}=${encodeURIComponent(normalizedValue)}`;
    })
    .join('&');

const createRequestOptions = (method, payload) => ({
  method,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: payload ? toUrlEncodedBody(payload) : undefined,
});

const ensureOk = response => {
  if (!response.ok) {
    throw createConnectionError();
  }

  return response;
};

const parseJsonSafely = async response => {
  try {
    return await response.json();
  } catch (error) {
    throw createConnectionError();
  }
};

export const uploadEmergencyReport = async ({
  user,
  phone,
  type,
  message,
  latitude,
  longitude,
  timestamp,
}) => {
  try {
    const response = await fetch(
      UPLOAD_ENDPOINT,
      createRequestOptions('POST', {
        user: user || 'Unknown User',
        phone: phone || '',
        type: type || 'Unknown',
        message: message || '',
        latitude: latitude ?? '',
        longitude: longitude ?? '',
        timestamp: timestamp || new Date().toISOString(),
      }),
    );

    ensureOk(response);
    return true;
  } catch (error) {
    throw createConnectionError();
  }
};

export const fetchNewMessages = async () => {
  try {
    const response = await fetch(MESSAGES_ENDPOINT);
    ensureOk(response);

    const payload = await parseJsonSafely(response);
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.messages)) {
      return payload.messages;
    }

    if (payload && typeof payload === 'object') {
      return [payload];
    }

    return [];
  } catch (error) {
    throw createConnectionError();
  }
};

export const acknowledgeMessage = async alert => {
  const payload = {
    id: alert?.id ?? alert?.messageId ?? '',
    user: alert?.user ?? '',
    phone: alert?.phone ?? '',
    timestamp: alert?.timestamp ?? '',
  };

  try {
    const response = await fetch(ACK_ENDPOINT, createRequestOptions('POST', payload));
    ensureOk(response);
    return true;
  } catch (error) {
    throw createConnectionError();
  }
};

export {ESP32_BASE_URL};
