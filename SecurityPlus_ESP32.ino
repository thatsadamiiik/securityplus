#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <Keypad.h>

const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {32, 33, 25, 26};
byte colPins[COLS] = {27, 14, 12, 13};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

String currentKeypadCode = "";

// --- PINY ---
const int MC38_SENSOR_1 = 21;
const int MC38_SENSOR_2 = 19;
const int MOTION_SENSOR = 18;
const int BUZZER_PIN = 17;

// --- NASTAVENIA ---
Preferences preferences;
String ssid = "";
String password = "";
String apiUrl = "http://35.158.231.80:3000/api";
String householdKey = "DOM-2024-A1B2C3";
int householdId = 1;

// --- STAVOVÉ PREMENNÉ ---
int mc1_lastState = HIGH;
int mc2_lastState = HIGH;
int motion_lastState = LOW;
bool alarmActive = false;
bool buzzerActive = false;
unsigned long lastApiCheck = 0;
unsigned long lastHeartbeat = 0;
const unsigned long API_CHECK_INTERVAL = 3000;

// --- NOVÉ PREMENNÉ PRE VYLEPŠENÝ BZUČIAK ---
unsigned long ignoreSensorsUntil = 0;
unsigned long lastBuzzerToggle = 0;
bool buzzerPinState = false;
unsigned long lastMotionEvent = 0;
const unsigned long MOTION_COOLDOWN = 30000; // 30s cooldown medzi motion udalosťami

// --- STAV SENZOROV (zapnuté/vypnuté z aplikácie) ---
bool sensor1Enabled = true; // Senzor ID 1
bool sensor2Enabled = true; // Senzor ID 2
bool sensor4Enabled = true; // Senzor ID 4 (pohyb)
bool buzzerNotifiedToServer = false; // true = server potvrdil ze vie o aktivnom buzzeri
const unsigned long HEARTBEAT_INTERVAL = 30000;

// --- STAV PRIPOJENIA ---
bool wifiConnected = false;
bool apiReachable = false;
unsigned long lastConnectionAttempt = 0;
const unsigned long RECONNECT_INTERVAL = 5000;

// --- KONFIGURAČNÝ REŽIM ---
bool configMode = false;
unsigned long configModeTimeout = 0;
const unsigned long CONFIG_TIMEOUT = 300000;

// --- FUNKCIA: Odošli status správu do aplikácie ---
// Formát: STATUS|typ|správa
// Typy: OK, ERROR, INFO, WIFI_CONNECTED, WIFI_FAILED, CONFIG_SAVED, ALARM_ON, ALARM_OFF
void sendStatus(String type, String message) {
  Serial.println("STATUS|" + type + "|" + message);
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("SecurityPlus ESP32");
  Serial.println("=================================\n");

  // Inicializácia úložiska
  preferences.begin("secplus", false);

  // Inicializácia pinov
  pinMode(MC38_SENSOR_1, INPUT_PULLUP);
  pinMode(MC38_SENSOR_2, INPUT_PULLUP);
  pinMode(MOTION_SENSOR, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Načítanie počiatočných stavov senzorov
  mc1_lastState = digitalRead(MC38_SENSOR_1);
  mc2_lastState = digitalRead(MC38_SENSOR_2);
  motion_lastState = digitalRead(MOTION_SENSOR);

  sendStatus("INFO", "Zariadenie sa spusta");

  // Načítanie WiFi údajov z pamäte
  ssid = preferences.getString("ssid", "");
  password = preferences.getString("password", "");

  if (ssid.length() > 0) {
    sendStatus("INFO", "Nacitane WiFi udaje z pamate, SSID: " + ssid);
    connectToWiFi();
  } else {
    sendStatus("INFO", "Ziadne WiFi udaje v pamati. Pouzite CONFIG na nastavenie.");
    enterConfigMode();
  }

  delay(1000);
}

void loop() {

  // Konfiguračný režim
  if (configMode) {
    handleConfigMode();
    return;
  }

  // 0. KLÁVESNICA (KEYPAD)
  char key = keypad.getKey();
  if (key) {
    sendStatus("INFO", "Klavesnica: stlacene '" + String(key) + "'");
    if (key == '#') {
      if (currentKeypadCode.length() > 0) {
        sendStatus("INFO", "Odosielam kod: " + currentKeypadCode + " (dlzka: " + String(currentKeypadCode.length()) + ")");
        verifyKeypadCode();
        currentKeypadCode = "";
      }
    } else if (key == '*') {
      currentKeypadCode = ""; // Vymazanie vstupu
      sendStatus("INFO", "Kod vymazany");
    } else {
      if (currentKeypadCode.length() < 10) {
        currentKeypadCode += key;
        sendStatus("INFO", "Aktualny kod: " + currentKeypadCode);
      }
    }
  }

  // 0.5 BZUČIAK PÍPANIE (800ms ON, 200ms OFF = alarmový vzor)
  if (buzzerActive) {
    unsigned long buzzerElapsed = millis() - lastBuzzerToggle;
    if (buzzerPinState && buzzerElapsed >= 800) {
      // Bol zapnuty 800ms, kratko vypnut
      buzzerPinState = false;
      digitalWrite(BUZZER_PIN, LOW);
      lastBuzzerToggle = millis();
    } else if (!buzzerPinState && buzzerElapsed >= 200) {
      // Bol vypnuty 200ms, znova zapnut
      buzzerPinState = true;
      digitalWrite(BUZZER_PIN, HIGH);
      lastBuzzerToggle = millis();
    }
  }

  // 1. KONTROLA WIFI PRIPOJENIA
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnected) {
      sendStatus("ERROR", "WiFi spojenie stratene!");
      wifiConnected = false;
      apiReachable = false;
    }

    if (millis() - lastConnectionAttempt > RECONNECT_INTERVAL) {
      sendStatus("INFO", "Pokus o opätovné pripojenie k WiFi...");
      connectToWiFi();
      lastConnectionAttempt = millis();
    }

    // Kontrola sériového vstupu aj keď nie je WiFi
    if (Serial.available()) {
      String input = Serial.readStringUntil('\n');
      input.trim();
      if (input == "CONFIG" || input == "config") {
        enterConfigMode();
        return;
      }
    }

    delay(1000);
    return;
  }

  if (!wifiConnected) {
    wifiConnected = true;
    sendStatus("WIFI_CONNECTED", "WiFi pripojene! IP: " + WiFi.localIP().toString());
  }

  // 2. KONTROLA STAVU ALARMU (API)
  if (millis() - lastApiCheck > API_CHECK_INTERVAL) {
    checkAlarmStatus();
    lastApiCheck = millis();
  }

  // 3. HEARTBEAT
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  // 4. SENZOR 1 (Dvere/Okno) - VŽDY logovať otvorenie aj zatvorenie
  int mc1_currentState = digitalRead(MC38_SENSOR_1);
  if (mc1_currentState != mc1_lastState) {
    delay(50);
    mc1_currentState = digitalRead(MC38_SENSOR_1);

    if (mc1_currentState != mc1_lastState) {
      mc1_lastState = mc1_currentState;

      if (sensor1Enabled) {
        if (mc1_currentState == LOW) {
          sendStatus("INFO", "Senzor 1: Dvere zatvorene");
          sendEvent(1, "door_closed", alarmActive ? "warning" : "info", "Hlavne dvere zatvorene");
        } else {
          sendStatus(alarmActive ? "ALARM_ON" : "INFO", "Senzor 1: Dvere otvorene!");
          sendEvent(1, "door_opened", alarmActive ? "alert" : "warning", "Hlavne dvere otvorene");

          if (alarmActive && millis() >= ignoreSensorsUntil) {
            activateBuzzer();
          }
        }
      }
    }
  }

  // 5. SENZOR 2 (Dvere/Okno) - VŽDY logovať otvorenie aj zatvorenie
  int mc2_currentState = digitalRead(MC38_SENSOR_2);
  if (mc2_currentState != mc2_lastState) {
    delay(50);
    mc2_currentState = digitalRead(MC38_SENSOR_2);

    if (mc2_currentState != mc2_lastState) {
      mc2_lastState = mc2_currentState;

      if (sensor2Enabled) {
        if (mc2_currentState == LOW) {
          sendStatus("INFO", "Senzor 2: Okno zatvorene");
          sendEvent(2, "door_closed", alarmActive ? "warning" : "info", "Okno obyvacka zatvorene");
        } else {
          sendStatus(alarmActive ? "ALARM_ON" : "INFO", "Senzor 2: Okno otvorene!");
          sendEvent(2, "door_opened", alarmActive ? "alert" : "warning", "Okno obyvacka otvorene");

          if (alarmActive && millis() >= ignoreSensorsUntil) {
            activateBuzzer();
          }
        }
      }
    }
  }

  // 6. POHYBOVÝ SENZOR - 30s cooldown medzi hláseniami
  int motion_currentState = digitalRead(MOTION_SENSOR);
  if (motion_currentState != motion_lastState) {
    delay(100);
    motion_currentState = digitalRead(MOTION_SENSOR);

    if (motion_currentState != motion_lastState) {
      motion_lastState = motion_currentState;

      if (sensor4Enabled && motion_currentState == HIGH && millis() >= ignoreSensorsUntil) {
        // Len ak uplynulo 30s od posledného hlásenia
        if (millis() - lastMotionEvent >= MOTION_COOLDOWN) {
          lastMotionEvent = millis();
          sendStatus(alarmActive ? "ALARM_ON" : "INFO", "Pohyb detekovany!");
          sendEvent(4, "motion_detected", alarmActive ? "alert" : "info", "Zaznamenany pohyb v chodbe");

          if (alarmActive) {
            activateBuzzer();
          }
        }
      }
    }
  }

  // 7. SÉRIOVÉ PRÍKAZY
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "BUZZER_OFF" || command == "buzzer_off") {
      deactivateBuzzer();
      sendStatus("OK", "Buzzer deaktivovany");
    } else if (command == "CONFIG" || command == "config") {
      enterConfigMode();
    } else if (command == "STATUS" || command == "status") {
      // Odošli aktuálny stav zariadenia
      sendStatus("INFO", "WiFi: " + String(wifiConnected ? "pripojene" : "odpojene") +
                 ", API: " + String(apiReachable ? "dostupne" : "nedostupne") +
                 ", Alarm: " + String(alarmActive ? "aktivny" : "neaktivny") +
                 ", Buzzer: " + String(buzzerActive ? "zapnuty" : "vypnuty") +
                 ", RSSI: " + String(WiFi.RSSI()) + " dBm");
    }
  }

  delay(100);
}

// --- WIFI FUNKCIE ---

void connectToWiFi() {
  sendStatus("INFO", "Pripajanie k WiFi: " + ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    sendStatus("WIFI_CONNECTED", "WiFi pripojene! IP: " + WiFi.localIP().toString() + ", RSSI: " + String(WiFi.RSSI()) + " dBm");
    testApiConnection();
  } else {
    wifiConnected = false;
    sendStatus("WIFI_FAILED", "Pripojenie k WiFi zlyhalo! Skontrolujte SSID a heslo.");
  }
}

void testApiConnection() {
  sendStatus("INFO", "Testujem pripojenie k serveru...");
  HTTPClient http;

  String url = apiUrl + "/household/ping";
  http.begin(url);
  http.setTimeout(5000);

  int httpCode = http.GET();

  if (httpCode > 0) {
    apiReachable = true;
    sendStatus("OK", "Server je dostupny! (HTTP " + String(httpCode) + ")");
  } else {
    apiReachable = false;
    sendStatus("ERROR", "Server nie je dostupny: " + http.errorToString(httpCode));
  }

  http.end();
}

// --- ALARM A UDALOSTI ---

void checkAlarmStatus() {
  if (!wifiConnected) return;

  HTTPClient http;
  String url = apiUrl + "/household/status/" + String(householdId);

  http.begin(url);
  http.setTimeout(3000);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();

    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      String alarmStatus = doc["alarm_status"];
      bool newAlarmState = (alarmStatus == "active");

      if (newAlarmState != alarmActive) {
        alarmActive = newAlarmState;

        if (alarmActive) {
          sendStatus("ALARM_ON", "Alarm bol AKTIVOVANY!");
        } else {
          sendStatus("ALARM_OFF", "Alarm bol DEAKTIVOVANY");
          // Keď sa alarm vypne, buzzer sa musí tiež vypnúť (bez grace period)
          if (buzzerActive) {
            buzzerActive = false;
            digitalWrite(BUZZER_PIN, LOW);
            sendStatus("OK", "Buzzer vypnuty spolu s alarmom");
          }
        }
      }

      // Buzzer sa vypne LEN keď to potvrdí aplikácia cez API (buzzer_active = false)
      // ALE IBA ak sme si isti ze server vie o aktivnom buzzeri
      bool serverBuzzerActive = doc["buzzer_active"] | false;
      if (buzzerActive && !serverBuzzerActive) {
        if (buzzerNotifiedToServer) {
          // Server vie o buzzeri a ZAMERME ho vypol (uzivatel klikol v apke)
          deactivateBuzzer();
          sendStatus("OK", "Buzzer vypnuty z aplikacie");
        } else {
          // Server NEVIE ze buzzer je aktivny, skus znova notifikovat
          notifyBuzzerStatus(true);
        }
      }

      apiReachable = true;

      // -- Načítaj stav senzorov (zapnuté/vypnuté z aplikácie) --
      JsonObject sensorsObj = doc["sensors_enabled"];
      if (!sensorsObj.isNull()) {
        sensor1Enabled = sensorsObj["1"] | true;
        sensor2Enabled = sensorsObj["2"] | true;
        sensor4Enabled = sensorsObj["4"] | true;
      }
    }
  } else if (httpCode > 0) {
    sendStatus("ERROR", "Chyba pri kontrole alarmu. HTTP: " + String(httpCode));
    apiReachable = false;
  } else {
    sendStatus("ERROR", "Chyba spojenia so serverom: " + http.errorToString(httpCode));
    apiReachable = false;
  }

  http.end();
}

void sendEvent(int sensorId, String eventType, String severity, String description) {
  if (!wifiConnected) {
    sendStatus("ERROR", "Nie je mozne odoslat udalost - WiFi nie je pripojene");
    return;
  }

  StaticJsonDocument<512> doc;
  doc["household_id"] = householdId;
  doc["sensor_id"] = sensorId;
  doc["event_type"] = eventType;
  doc["severity"] = severity;
  doc["description"] = description;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // 2 pokusy pre spolahlivost
  for (int attempt = 0; attempt < 2; attempt++) {
    HTTPClient http;
    String url = apiUrl + "/household/events/add";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(3000);

    int httpCode = http.POST(jsonPayload);

    if (httpCode == 200 || httpCode == 201) {
      apiReachable = true;
      http.end();
      delay(100);
      return; // Uspech
    } else {
      if (attempt == 0) {
        sendStatus("ERROR", "Odoslanie udalosti zlyhalo (pokus 1), skusam znova: " + String(httpCode));
      } else {
        sendStatus("ERROR", "Odoslanie udalosti zlyhalo definitvne: " + String(httpCode));
        apiReachable = false;
      }
      http.end();
      delay(200);
    }
  }
}

void sendHeartbeat() {
  if (!wifiConnected) return;

  HTTPClient http;
  String url = apiUrl + "/household/heartbeat";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  StaticJsonDocument<256> doc;
  doc["household_id"] = householdId;
  doc["device_type"] = "ESP32";
  doc["rssi"] = WiFi.RSSI();
  doc["ip"] = WiFi.localIP().toString();

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);

  if (httpCode == 200) {
    apiReachable = true;
  } else {
    apiReachable = false;
  }

  http.end();
}

// --- BUZZER ---

void activateBuzzer() {
  if (!buzzerActive) {
    buzzerActive = true;
    buzzerPinState = true;
    buzzerNotifiedToServer = false; // Este server nevie
    digitalWrite(BUZZER_PIN, HIGH);
    lastBuzzerToggle = millis();
    sendStatus("ALARM_ON", "BUZZER AKTIVOVANY! Detekovany narusenie!");
    sendEvent(0, "other", "alert", "Buzzer aktivovany - detekovany alarm");
    // Oznám serveru, že buzzer je aktívny
    notifyBuzzerStatus(true);
    // Oddial dalsi API check
    lastApiCheck = millis();
  }
}

void deactivateBuzzer() {
  if (!buzzerActive) return; // Ak buzzer nie je aktívny, nerob nič
  buzzerActive = false;
  buzzerPinState = false;
  digitalWrite(BUZZER_PIN, LOW);
  ignoreSensorsUntil = millis() + 30000; // 30s grace period
  sendStatus("OK", "Buzzer deaktivovany, senzory stlmene na 30s");
  sendEvent(0, "other", "info", "Buzzer deaktivovany, senzory stlmene na 30s");
  notifyBuzzerStatus(false);
}

void notifyBuzzerStatus(bool active) {
  if (!wifiConnected) return;

  HTTPClient http;
  String url = apiUrl + "/household/buzzer/notify";
  
  StaticJsonDocument<256> doc;
  doc["household_id"] = householdId;
  doc["is_active"] = active;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int maxRetries = 3;
  for(int i = 0; i < maxRetries; i++) {
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(3000);
    
    int httpCode = http.POST(jsonPayload);
    
    if (httpCode == 200 || httpCode == 201) {
      if (active) {
        buzzerNotifiedToServer = true; // Server potvrdil ze vie!
      }
      sendStatus("OK", "Buzzer status uspesne odoslany: " + String(active));
      http.end();
      delay(150);
      return; 
    } else {
      sendStatus("ERROR", "Odoslanie buzzer statusu zlyhalo (pokus " + String(i+1) + "): " + String(httpCode));
      http.end();
      delay(500);
    }
  }
  // Ak vsetky pokusy zlyhali, buzzerNotifiedToServer ostane false
  // a ESP32 bude ignorovat server-driven deaktivaciu
}

void verifyKeypadCode() {
  if (!wifiConnected) return;

  sendStatus("INFO", "Overujem kod: " + currentKeypadCode);

  HTTPClient http;
  String url = apiUrl + "/arduino/keypad-deactivate";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  
  StaticJsonDocument<256> doc;
  doc["household_key"] = householdKey;
  doc["keypad_code"] = currentKeypadCode;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);

  if (httpCode == 200) {
    sendStatus("OK", "Kod spravny. Deaktivujem buzzer.");
    deactivateBuzzer();
  } else if (httpCode == 401) {
    sendStatus("ERROR", "Nespravny kod");
  } else {
    sendStatus("ERROR", "Chyba servera pri overovani: " + String(httpCode));
  }
  
  http.end();
}

// --- KONFIGURAČNÝ REŽIM ---

void enterConfigMode() {
  configMode = true;
  configModeTimeout = millis();

  sendStatus("INFO", "Konfiguracny rezim aktivovany. Cakam na prikazy...");

  Serial.println("\n--- KONFIGURACNY REZIM ---");
  Serial.println("Prikazy:");
  Serial.println("  SET_WIFI <SSID>|<HESLO>");
  Serial.println("  SHOW_CONFIG");
  Serial.println("  TEST_WIFI");
  Serial.println("  EXIT");
  Serial.println("Priklad: SET_WIFI Humaj Residence|MojeHeslo123");
  Serial.println("Casovy limit: 5 minut\n");
}

void handleConfigMode() {
  // Timeout kontrola
  if (millis() - configModeTimeout > CONFIG_TIMEOUT) {
    sendStatus("INFO", "Konfiguracny rezim vyprsal. Ukoncujem...");
    configMode = false;
    return;
  }

  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();

    if (input.startsWith("SET_WIFI ")) {
      // Formát: SET_WIFI <SSID>|<HESLO>
      // Oddeľovač je | (pipe) aby SSID mohlo obsahovať medzery
      String data = input.substring(9); // Odstráň "SET_WIFI "

      int pipeIndex = data.indexOf('|');
      if (pipeIndex > 0) {
        String newSsid = data.substring(0, pipeIndex);
        String newPassword = data.substring(pipeIndex + 1);

        newSsid.trim();
        newPassword.trim();

        if (newSsid.length() > 0) {
          ssid = newSsid;
          password = newPassword;

          // Ulož do trvalej pamäte
          preferences.putString("ssid", ssid);
          preferences.putString("password", password);

          sendStatus("CONFIG_SAVED", "WiFi udaje ulozene! SSID: " + ssid);

          // Skús sa pripojiť
          sendStatus("INFO", "Testujem pripojenie...");
          configMode = false;
          connectToWiFi();
        } else {
          sendStatus("ERROR", "Neplatne SSID - je prazdne");
        }
      } else {
        // Spätná kompatibilita - skús aj formát s medzerou (ak SSID nemá medzeru)
        int spaceIndex = data.indexOf(' ');
        if (spaceIndex > 0) {
          String newSsid = data.substring(0, spaceIndex);
          String newPassword = data.substring(spaceIndex + 1);

          newSsid.trim();
          newPassword.trim();

          if (newSsid.length() > 0) {
            ssid = newSsid;
            password = newPassword;

            preferences.putString("ssid", ssid);
            preferences.putString("password", password);

            sendStatus("CONFIG_SAVED", "WiFi udaje ulozene! SSID: " + ssid);

            configMode = false;
            connectToWiFi();
          } else {
            sendStatus("ERROR", "Neplatne SSID");
          }
        } else {
          sendStatus("ERROR", "Nespravny format. Pouzite: SET_WIFI NazovSiete|Heslo");
        }
      }
    }
    else if (input == "SHOW_CONFIG") {
      sendStatus("INFO", "SSID: " + ssid +
                 ", Heslo: " + String(password.length() > 0 ? "nastavene" : "prazdne") +
                 ", API: " + apiUrl +
                 ", Household: " + String(householdId));
    }
    else if (input == "TEST_WIFI") {
      if (ssid.length() > 0) {
        sendStatus("INFO", "Testujem WiFi pripojenie...");
        configMode = false;
        connectToWiFi();
      } else {
        sendStatus("ERROR", "Ziadne WiFi udaje! Najprv pouzite SET_WIFI");
      }
    }
    else if (input == "EXIT") {
      sendStatus("INFO", "Konfiguracny rezim ukonceny");
      configMode = false;

      if (ssid.length() > 0 && WiFi.status() != WL_CONNECTED) {
        connectToWiFi();
      }
    }
    else if (input == "STATUS" || input == "status") {
      sendStatus("INFO", "WiFi: " + String(wifiConnected ? "pripojene" : "odpojene") +
                 ", API: " + String(apiReachable ? "dostupne" : "nedostupne") +
                 ", Alarm: " + String(alarmActive ? "aktivny" : "neaktivny"));
    }
    else if (input == "HELP" || input == "help") {
      Serial.println("\nDostupne prikazy:");
      Serial.println("  SET_WIFI <SSID>|<HESLO> - Nastavit WiFi udaje");
      Serial.println("  SHOW_CONFIG - Zobrazit aktualne nastavenia");
      Serial.println("  TEST_WIFI - Otestovat WiFi pripojenie");
      Serial.println("  STATUS - Zobrazit stav zariadenia");
      Serial.println("  EXIT - Ukoncit konfiguracny rezim");
      Serial.println("  HELP - Zobrazit napovedu\n");
    }
    else {
      sendStatus("ERROR", "Neznamy prikaz: " + input + ". Napiste HELP pre napovedu.");
    }
  }

  delay(100);
}
