export function getStorage(key, defaultVal = []) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultVal
  } catch { return defaultVal }
}

export function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}
