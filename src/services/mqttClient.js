// src/services/mqttClient.js
const mqtt = require('mqtt');

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com';

const client = mqtt.connect(MQTT_BROKER);

client.on('connect', () => {
    console.log('Backend conectado ao Broker MQTT com sucesso!');
});

client.on('error', (error) => {
    console.error('Erro na conexão MQTT do backend:', error);
});

module.exports = client;