#pragma once
#include <Arduino.h>

// ---- Zone identity: set per environment in platformio.ini (-DZONE_ID=n) ----
#ifndef ZONE_ID
#define ZONE_ID 1
#endif

#define STR_(x) #x
#define STR(x) STR_(x)
// ESP32_NODE_001 .. ESP32_NODE_004
static const char NODE_ID[] = "ESP32_NODE_00" STR(ZONE_ID);

// Zone 1 carries the shared DHT22 and BH1750.
#define HAS_DHT   (ZONE_ID == 1)
#define HAS_LIGHT (ZONE_ID == 1)

// ---- Firebase paths (report Table 4.4 / Appendix A.5; confirm against the app) ----
#define SENSORS_PATH "/sensors/"       // + NODE_ID
#define PUMP_PATH    "/pump/active/"   // + NODE_ID  (key may be a zone id in the app: check)
#define CONFIG_PATH  "/zones/"         // + NODE_ID: mode, soilLow, soilHigh, soilAlert, tempAlert
#define ALERTS_PATH  "/alerts"         // pushed by nodes when a problem starts
#define HISTORY_PATH "/history/"       // + NODE_ID, one pushed record per interval (charts)

// ---- Pins ----
#define PIN_SOIL   34   // ADC1
#define PIN_RELAY  26
#define PIN_LED    27
#define PIN_DHT     4
#define PIN_SDA    21
#define PIN_SCL    22

// Opto relay boards often switch ON with LOW. Test first, then fix this one flag.
#define RELAY_ACTIVE_LOW true

// ---- Soil calibration (raw 12-bit ADC). Capacitive probe: high raw = dry. ----
// Replace per node after calibration (report Appendix F.2).
#define DRY_RAW 3350   // zone 4 probe: 3359 in air (zone 1: 3270-3335)
#define WET_RAW 1330   // zone 4 probe: 1314-1353 in water to the line
// Raw values outside this window mean a disconnected or shorted probe.
#define SOIL_RAW_MIN 100
#define SOIL_RAW_MAX 4000

// ---- Timing (ms) ----
#define SENSOR_INTERVAL_MS   5000UL   // matches the app's firmware info (5000 ms)
#define COMMAND_INTERVAL_MS  2000UL
#define CONFIG_INTERVAL_MS  10000UL   // how often zone settings are re-read
#define ALERT_COOLDOWN_MS  600000UL   // same alert type at most every 10 min
#define HISTORY_INTERVAL_MS 60000UL   // one history record per minute (report 4.12: 1 to 5 min)   // how often the on/off value is read
#define FAULT_AFTER_MS      10000UL   // soil invalid this long -> fault, output OFF
#define FAILSAFE_AFTER_MS   15000UL   // no successful command read this long -> OFF
#define MAX_ON_MS         1800000UL   // max run per start (30 min), then forced OFF

// ---- Defaults used until /zones/<node> says otherwise ----
#define DEFAULT_SOIL_LOW    30.0f   // auto mode: turn ON below this %
#define DEFAULT_SOIL_HIGH   60.0f   // auto mode: turn OFF at or above this %
#define DEFAULT_SOIL_ALERT  30.0f   // alert below this %
#define DEFAULT_TEMP_ALERT  36.0f   // alert above this C (report: about 36)
