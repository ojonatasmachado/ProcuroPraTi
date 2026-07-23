const DEVICE_ID_KEY = 'procuroPraTi_companyDeviceId';

export const getCompanyDeviceId = () => {
  let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const getCompanyDeviceName = () => {
  const agent = navigator.userAgent;
  if (/iPhone/i.test(agent)) return 'iPhone';
  if (/iPad/i.test(agent)) return 'iPad';
  if (/Android/i.test(agent)) return 'Celular Android';
  if (/Windows/i.test(agent)) return 'Computador Windows';
  if (/Macintosh/i.test(agent)) return 'Mac';
  if (/Linux/i.test(agent)) return 'Computador Linux';
  return 'Dispositivo';
};

export const generateCompanyPin = () => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
};
