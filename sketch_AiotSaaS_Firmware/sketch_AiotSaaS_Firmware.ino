/*
  Firmware AIoT SaaS v1.1 - Conexão Wi-Fi Robusta
  Esta versão inclui melhorias na rotina de conexão para garantir mais estabilidade.
*/

// --- BIBLIOTECAS ---
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// =====================================================================
// === CONFIGURAÇÃO PRINCIPAL DO DISPOSITIVO ===
// =====================================================================
const char* WIFI_SSID = "SEU_WIFI";       // <-- SEU WIFI AQUI
const char* WIFI_PASSWORD = "SENHA_DO_SEU_WIFI"; // <-- SUA SENHA AQUI

// !!! IMPORTANTE: O IDENTIFICADOR ÚNICO DESTE DISPOSITIVO FÍSICO !!!
const char* DEVICE_UUID = "a1b2c3d4-e5f6-7890-1234-567890abcdef";
// =====================================================================


// --- CONFIGURAÇÕES DO MQTT ---
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
char topico_comando[128];
char topico_estado[128];

// --- CONFIGURAÇÕES DOS PINOS ---
const int pinosRele[8] = {26, 25, 33, 32, 27, 14, 12, 13};
const int NUM_RELES = 8;
#define RELE_LIGADO LOW
#define RELE_DESLIGADO HIGH

// --- OBJETOS GLOBAIS ---
WiFiClient espClient;
PubSubClient client(espClient);

// Protótipos de Funções
void setup_wifi();
void reconnect();
void publicarEstado();
void callback(char* topic, byte* payload, unsigned int length);

void setup() {
    Serial.begin(115200);
    Serial.println("\n--- Iniciando Firmware AIoT SaaS v1.1 ---");
    Serial.print("Device UUID: ");
    Serial.println(DEVICE_UUID);

    for (int i = 0; i < NUM_RELES; i++) {
        pinMode(pinosRele[i], OUTPUT);
        digitalWrite(pinosRele[i], RELE_DESLIGADO);
    }

    sprintf(topico_comando, "pluga-shop/devices/%s/comando", DEVICE_UUID);
    sprintf(topico_estado, "pluga-shop/devices/%s/estado", DEVICE_UUID);

    setup_wifi(); // Chama a nova função de setup robusta
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);
}

void loop() {
    if (!client.connected()) {
        reconnect();
    }
    client.loop();
}

// =====================================================================
// === FUNÇÕES AUXILIARES (COM A CORREÇÃO) ===
// =====================================================================

void setup_wifi() {
    delay(100);
    Serial.println("\nIniciando conexão Wi-Fi...");

    // =======================================================
    // === MELHORIAS PARA UMA CONEXÃO MAIS ROBUSTA ===
    // =======================================================
    // 1. Define explicitamente o modo Wi-Fi como "Station" (cliente de uma rede).
    WiFi.mode(WIFI_STA);
    
    // 2. Desconecta de qualquer rede anterior para garantir um início limpo.
    WiFi.disconnect(true); 
    delay(100);
    // =======================================================

    Serial.print("Conectando à rede: ");
    Serial.println(WIFI_SSID);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    // Tenta conectar por 20 segundos
    int tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 40) {
        delay(500);
        Serial.print(".");
        tries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWi-Fi conectado com sucesso!");
        Serial.print("Endereço IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\nFalha ao conectar no Wi-Fi. Reiniciando em 10 segundos...");
        delay(10000);
        ESP.restart(); // Reinicia o ESP se não conseguir conectar
    }
}


// O resto das funções (callback, reconnect, publicarEstado) permanece o mesmo.
// Colei-as abaixo para garantir que você tenha o arquivo completo.

void callback(char* topic, byte* payload, unsigned int length) {
    String mensagem;
    for (int i = 0; i < length; i++) {
        mensagem += (char)payload[i];
    }
    Serial.println("Mensagem recebida: " + mensagem);

    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, mensagem);
    if (error) { return; }
    
    int releId = doc["rele"];      
    const char* estado = doc["estado"]; 

    if (releId >= 1 && releId <= NUM_RELES) {
        if (strcmp(estado, "on") == 0) {
            digitalWrite(pinosRele[releId - 1], RELE_LIGADO);
        } else if (strcmp(estado, "off") == 0) {
            digitalWrite(pinosRele[releId - 1], RELE_DESLIGADO);
        }
    }
    publicarEstado();
}

void reconnect() {
    while (!client.connected()) {
        Serial.print("Tentando conectar ao Broker MQTT...");
        String clientId = "ESP32-";
        clientId += DEVICE_UUID;

        if (client.connect(clientId.c_str())) {
            Serial.println("Conectado!");
            client.subscribe(topico_comando);
            Serial.print("Inscrito no tópico: ");
            Serial.println(topico_comando);
            publicarEstado(); 
        } else {
            Serial.print("falhou, rc=");
            Serial.print(client.state());
            Serial.println(" tentando novamente em 5 segundos");
            delay(5000);
        }
    }
}

void publicarEstado() {
    StaticJsonDocument<256> doc;
    for(int i=0; i < NUM_RELES; i++){
        doc[String(i+1)] = (digitalRead(pinosRele[i]) == RELE_LIGADO) ? "on" : "off";
    }
    
    char buffer[256];
    size_t n = serializeJson(doc, buffer);
    client.publish(topico_estado, buffer, n);
}
