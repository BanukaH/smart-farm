// Smart farming zone node: ESP32 + soil sensor (+ DHT22/BH1750 on zone 1) + relay + LED.
// Writes readings to /sensors/<node> and history, reads /pump/active/<node> (manual mode)
// or decides on its own from soil moisture (auto mode), and raises alerts to /alerts.
#include <Arduino.h>
#include <WiFi.h>
#include <time.h>
#include <Wire.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

#include "config.h"
#include "secrets.h"

#if HAS_DHT
#include <DHT.h>
#endif
#if HAS_LIGHT
#include <BH1750.h>
#endif

FirebaseData fbdo;
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;

#if HAS_DHT
DHT dht(PIN_DHT, DHT22);
float lastTemp = NAN, lastHum = NAN;
bool dhtFault = false;
#endif
#if HAS_LIGHT
BH1750 lightMeter;
bool lightAvailable = false;
#endif

// ---- state ----
bool wantOn = false;          // manual mode: last command read from Firebase
bool outputOn = false;        // what the relay/LED are doing now
bool lockout = false;         // max-run reached: stay OFF until the command / soil resets it
bool soilFault = false;
unsigned long soilBadSince = 0;
unsigned long lastCommandOk = 0;
unsigned long onSince = 0;
unsigned long lastSensorMs = 0, lastCommandMs = 0, lastHistoryMs = 0, lastConfigMs = 0;
float soilPct = NAN;

// ---- zone settings (from /zones/<node>) ----
bool autoMode = false;
float soilLow = DEFAULT_SOIL_LOW, soilHigh = DEFAULT_SOIL_HIGH;
float soilAlertTh = DEFAULT_SOIL_ALERT, tempAlertTh = DEFAULT_TEMP_ALERT;
bool autoOn = false;          // auto mode: the node's own decision
int lastMirrored = -1;        // auto mode: last value written to /pump/active (-1 = none yet)

// ---- alert state (edge-triggered so one problem is one alert) ----
bool soilAlertActive = false, faultAlertSent = false, tempAlertActive = false;
unsigned long lastSoilAlertMs = 0, lastFaultAlertMs = 0, lastTempAlertMs = 0;

// ---- output ----
void setOutput(bool on) {
  if (on == outputOn) return;
  outputOn = on;
  digitalWrite(PIN_RELAY, (on != RELAY_ACTIVE_LOW) ? HIGH : LOW);
  digitalWrite(PIN_LED, on ? HIGH : LOW);
  if (on) onSince = millis();
  Serial.printf("[out] %s\n", on ? "ON" : "OFF");
}

// ---- soil ----
int readSoilRaw() {
  uint32_t sum = 0;
  for (int i = 0; i < 16; i++) { sum += analogRead(PIN_SOIL); delay(2); }
  return sum / 16;
}

float rawToPercent(int raw) {
  float pct = (float)(raw - DRY_RAW) * 100.0f / (float)(WET_RAW - DRY_RAW);
  return constrain(pct, 0.0f, 100.0f);
}

void updateSoil() {
  int raw = readSoilRaw();
  bool valid = raw >= SOIL_RAW_MIN && raw <= SOIL_RAW_MAX;
  if (valid) {
    soilPct = rawToPercent(raw);
    soilBadSince = 0;
    soilFault = false;
  } else {
    soilPct = NAN;
    if (!soilBadSince) soilBadSince = millis();
    if (millis() - soilBadSince >= FAULT_AFTER_MS) soilFault = true;
  }
  Serial.printf("[soil] raw=%d pct=%s%s\n", raw,
                isnan(soilPct) ? "invalid" : String(soilPct, 1).c_str(),
                soilFault ? " FAULT" : "");
}

// ---- Wi-Fi / time ----
void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[wifi] connecting");
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) { delay(300); Serial.print('.'); }
  Serial.println(WiFi.status() == WL_CONNECTED ? " ok" : " failed (will keep retrying)");
}

int64_t epochMs() {
  time_t now = time(nullptr);
  return now > 1700000000 ? (int64_t)now * 1000LL : 0;
}

// ---- Firebase ----
// Lux from the BH1750, or NAN when it is not fitted / read failed (never write 0).
float readLux() {
#if HAS_LIGHT
  if (lightAvailable) {
    float lux = lightMeter.readLightLevel();
    if (lux >= 0) return lux;
  }
#endif
  return NAN;
}

void writeSensors() {
  if (!Firebase.ready()) return;
  FirebaseJson json;
  if (!isnan(soilPct)) json.set("soilMoisture", soilPct);
#if HAS_DHT
  if (!isnan(lastTemp)) json.set("temperature", lastTemp);
  if (!isnan(lastHum)) json.set("humidity", lastHum);
  json.set("dhtFault", dhtFault);
#endif
  float lux = readLux();
  if (!isnan(lux)) json.set("light", lux);
  json.set("status", soilFault ? "fault" : "online");
  json.set("nodeId", NODE_ID);
  json.set("mode", autoMode ? "auto" : "manual");
  json.set("relayOn", outputOn);          // acknowledgement: command sent vs actually running
  int64_t ts = epochMs();
  if (ts) json.set("timestamp", (double)ts);

  String path = String(SENSORS_PATH) + NODE_ID;
  if (!Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json))
    Serial.printf("[fb] write failed: %s\n", fbdo.errorReason().c_str());
}

// One record per interval under /history/<node> for the charts. Push keys keep time order.
void pushHistory() {
  int64_t ts = epochMs();
  if (!Firebase.ready() || isnan(soilPct) || !ts) return;
  FirebaseJson json;
  json.set("ts", (double)ts);
  json.set("soilMoisture", soilPct);
  json.set("relayOn", outputOn);          // lets the app total how long each zone ran
#if HAS_DHT
  if (!isnan(lastTemp)) json.set("temperature", lastTemp);
  if (!isnan(lastHum)) json.set("humidity", lastHum);
#endif
  float lux = readLux();
  if (!isnan(lux)) json.set("light", lux);
  String path = String(HISTORY_PATH) + NODE_ID;
  if (!Firebase.RTDB.pushJSON(&fbdo, path.c_str(), &json))
    Serial.printf("[fb] history failed: %s\n", fbdo.errorReason().c_str());
}

// ---- zone settings ----
void setAutoMode(bool on) {
  if (on == autoMode) return;
  autoMode = on;
  autoOn = false;
  lockout = false;
  lastMirrored = -1;
  Serial.printf("[mode] %s\n", on ? "AUTO" : "MANUAL");
  if (!on) {
    // Manual always starts OFF: don't inherit whatever auto left running.
    wantOn = false;
    lastCommandOk = millis();
    setOutput(false);
    String path = String(PUMP_PATH) + NODE_ID;
    Firebase.RTDB.setBool(&fbdo, path.c_str(), false);
  }
}

void readConfig() {
  if (!Firebase.ready()) return;
  String path = String(CONFIG_PATH) + NODE_ID;
  bool wantAuto = false;

  if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
    // Read every field before touching fbdo again: setAutoMode() may reuse it.
    FirebaseJson &json = fbdo.jsonObject();
    FirebaseJsonData d;

    wantAuto = json.get(d, "mode") && d.stringValue == "auto";

    float v;
    v = json.get(d, "soilLow") ? d.to<float>() : DEFAULT_SOIL_LOW;     soilLow = constrain(v, 0, 100);
    v = json.get(d, "soilHigh") ? d.to<float>() : DEFAULT_SOIL_HIGH;   soilHigh = constrain(v, 0, 100);
    v = json.get(d, "soilAlert") ? d.to<float>() : DEFAULT_SOIL_ALERT; soilAlertTh = constrain(v, 0, 100);
    v = json.get(d, "tempAlert") ? d.to<float>() : DEFAULT_TEMP_ALERT; tempAlertTh = constrain(v, 0, 80);
    if (soilHigh <= soilLow) soilHigh = min(100.0f, soilLow + 5.0f);   // keep a gap so it can't flicker
  } else if (fbdo.errorReason() != "path not exist") {
    Serial.printf("[fb] config failed: %s\n", fbdo.errorReason().c_str());
    return;                                                           // keep current mode on errors
  }

  setAutoMode(wantAuto);
}

// ---- alerts: written by the node so the log fills even when nobody has the app open ----
bool pushAlert(const char *type, const char *severity, float value) {
  int64_t ts = epochMs();
  if (!Firebase.ready() || !ts) return false;
  FirebaseJson json;
  json.set("ts", (double)ts);
  json.set("node", NODE_ID);
  json.set("type", type);
  json.set("severity", severity);
  if (!isnan(value)) json.set("value", value);
  json.set("read", false);
  bool ok = Firebase.RTDB.pushJSON(&fbdo, ALERTS_PATH, &json);
  if (!ok) Serial.printf("[fb] alert failed: %s\n", fbdo.errorReason().c_str());
  else Serial.printf("[alert] %s\n", type);
  return ok;
}

bool cooledDown(unsigned long last) {
  return last == 0 || millis() - last >= ALERT_COOLDOWN_MS;
}

void checkAlerts() {
  if (!isnan(soilPct)) {
    if (!soilAlertActive && soilPct < soilAlertTh && cooledDown(lastSoilAlertMs)) {
      if (pushAlert("soil_low", "critical", soilPct)) { soilAlertActive = true; lastSoilAlertMs = millis(); }
    } else if (soilAlertActive && soilPct >= soilAlertTh + 5.0f) {
      soilAlertActive = false;
    }
  }

  if (soilFault && !faultAlertSent && cooledDown(lastFaultAlertMs)) {
    if (pushAlert("sensor_fault", "critical", NAN)) { faultAlertSent = true; lastFaultAlertMs = millis(); }
  } else if (!soilFault) {
    faultAlertSent = false;
  }

#if HAS_DHT
  if (!isnan(lastTemp)) {
    if (!tempAlertActive && lastTemp > tempAlertTh && cooledDown(lastTempAlertMs)) {
      if (pushAlert("temp_high", "critical", lastTemp)) { tempAlertActive = true; lastTempAlertMs = millis(); }
    } else if (tempAlertActive && lastTemp <= tempAlertTh - 1.0f) {
      tempAlertActive = false;
    }
  }
#endif
}

// ---- command ----
void readCommand() {
  if (!Firebase.ready()) return;
  String path = String(PUMP_PATH) + NODE_ID;

  if (autoMode) {
    // The node decides. Mirror its state to /pump/active so the app shows what is happening.
    if (lastMirrored != (int)outputOn && Firebase.RTDB.setBool(&fbdo, path.c_str(), outputOn))
      lastMirrored = outputOn;
    return;
  }

  if (Firebase.RTDB.getBool(&fbdo, path.c_str())) {
    wantOn = fbdo.boolData();
    lastCommandOk = millis();
    if (!wantOn) lockout = false;
  } else if (fbdo.errorReason() == "path not exist") {
    wantOn = false;               // no node yet: treat as OFF, but the link is healthy
    lastCommandOk = millis();
    lockout = false;
  } else {
    Serial.printf("[fb] read failed: %s\n", fbdo.errorReason().c_str());
  }
}

void clearCommand() {
  if (!Firebase.ready()) return;
  String path = String(PUMP_PATH) + NODE_ID;
  Firebase.RTDB.setBool(&fbdo, path.c_str(), false);
  lastMirrored = 0;
}

// ---- output decision: safety first ----
void applyPolicy() {
  if (outputOn && millis() - onSince >= MAX_ON_MS) {
    Serial.println("[safe] max run time reached, forcing OFF");
    lockout = true;
    autoOn = false;
    setOutput(false);
    clearCommand();
    wantOn = false;
    return;
  }

  if (autoMode) {
    // Edge control: works with or without Wi-Fi, bounded by the max run time above.
    if (lockout && !isnan(soilPct) && soilPct >= soilHigh) lockout = false;   // soil recovered
    if (isnan(soilPct) || soilFault) autoOn = false;
    else if (!autoOn && soilPct < soilLow && !lockout) autoOn = true;
    else if (autoOn && soilPct >= soilHigh) autoOn = false;
    setOutput(autoOn && !soilFault && !lockout);
    return;
  }

  bool linkOk = WiFi.status() == WL_CONNECTED && lastCommandOk &&
                millis() - lastCommandOk < FAILSAFE_AFTER_MS;
  setOutput(wantOn && linkOk && !soilFault && !lockout);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\n== %s (zone %d) ==\n", NODE_ID, ZONE_ID);

  // Outputs off before anything else.
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_RELAY, RELAY_ACTIVE_LOW ? HIGH : LOW);
  digitalWrite(PIN_LED, LOW);

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_SOIL, ADC_11db);

#if HAS_DHT
  dht.begin();
#endif
#if HAS_LIGHT
  Wire.begin(PIN_SDA, PIN_SCL);
  lightAvailable = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  Serial.println(lightAvailable ? "[light] BH1750 ready" : "[light] BH1750 not found, light skipped");
#endif

  connectWifi();
  configTime(0, 0, "pool.ntp.org", "time.google.com");

  fbConfig.api_key = FIREBASE_API_KEY;
  fbConfig.database_url = FIREBASE_DATABASE_URL;
  fbAuth.user.email = FIREBASE_USER_EMAIL;
  fbAuth.user.password = FIREBASE_USER_PASSWORD;
  fbConfig.token_status_callback = tokenStatusCallback;
  fbdo.setBSSLBufferSize(4096, 1024);
  Firebase.reconnectNetwork(true);
  Firebase.begin(&fbConfig, &fbAuth);
}

void loop() {
  unsigned long now = millis();

  if (now - lastConfigMs >= CONFIG_INTERVAL_MS) {
    lastConfigMs = now;
    readConfig();
  }

  if (now - lastCommandMs >= COMMAND_INTERVAL_MS) {
    lastCommandMs = now;
    readCommand();
  }

  if (now - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = now;
    updateSoil();
#if HAS_DHT
    float t = dht.readTemperature(), h = dht.readHumidity();
    if (!isnan(t) && !isnan(h) && t > -40 && t < 80 && h >= 0 && h <= 100) {
      lastTemp = t; lastHum = h; dhtFault = false;
    } else {
      dhtFault = true;            // keep previous values, never write zeros
      Serial.println("[dht] read failed");
    }
    Serial.printf("[dht] %.1fC %.0f%%\n", lastTemp, lastHum);
#endif
    applyPolicy();
    checkAlerts();
    writeSensors();
  }

  if (now - lastHistoryMs >= HISTORY_INTERVAL_MS) {
    lastHistoryMs = now;
    if (now > SENSOR_INTERVAL_MS) pushHistory();   // skip the very first tick: no soil value yet
  }

  applyPolicy();
  delay(20);
}
