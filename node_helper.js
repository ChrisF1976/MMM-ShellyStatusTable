const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
    start: function () {
        this.config = {};
        this.isFetching = false; // Lock-Variable

        setTimeout(() => {
            console.log("MagicMirror is ready. Fetching Shelly status...");
            this.fetchShellyStatus();
        }, 15000); // Delay to ensure MagicMirror is fully loaded
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;

            if (this.config.shellys && Array.isArray(this.config.shellys)) {
                console.log("Configuration received, fetching Shelly status...");
                this.fetchShellyStatus();
            }
        } else if (notification === "GET_SHELLY_STATUS") {
            this.fetchShellyStatus();
        }
    },

    fetchShellyStatus: async function () {
        // Verhindere parallele Ausführungen
        if (this.isFetching) {
            console.log("⚠️ Fetch already in progress, skipping...");
            return;
        }

        this.isFetching = true; // Lock setzen

        const results = [];

        if (!this.config.shellys || !Array.isArray(this.config.shellys)) {
            console.error("No valid shellys configuration found or 'shellys' is not an array.");
            this.isFetching = false; // Lock freigeben
            return;
        }

        console.log(`Starting sequential fetch for ${this.config.shellys.length} Shelly devices...`);

        try {
            // Sequential statt parallel - nacheinander abfragen
            for (const shelly of this.config.shellys) {
                let retryCount = 0;
                const maxRetries = 1; // Maximal 1 Retry bei Rate-Limit
                
                while (retryCount <= maxRetries) {
                    try {
                        console.log(`Fetching status for ${shelly.name} (ID: ${shelly.id})...`);
                        
                        const response = await axios.post(
                            `${this.config.serverUri}/device/status`,
                            `id=${shelly.id}&auth_key=${this.config.authKey}`,
                            {
                                timeout: 10000 // 10 second timeout
                            }
                        );

                        const data = response.data?.data?.device_status;

                        if (data) {
                            let isOn = false;
                            let power = null;

                            // Check for Gen 1/2 structure (relay-based devices)
                            if (data.relays) {
                                const channel = parseInt(shelly.ch || 0, 10);
                                isOn = data.relays[channel]?.ison || false;
                                power = data.meters?.[channel]?.power || null;
                            }
                            // Check for Gen 3 structure (pm1:0 devices)
                            else if (data["pm1:0"]) {
                                isOn = true; // Assume true if data exists for the device
                                power = data["pm1:0"].apower; // Use 'apower' from pm1:0
                            }
                            // Check for "switch:0" structure
                            else if (data["switch:0"]) {
                                isOn = data["switch:0"].output; // Use 'output' for on/off status
                                power = data["switch:0"].apower; // Use 'apower' for power
                            }
                            // Check for RGB Shelly structure (lights array)
                            else if (data.lights) {
                                const light = data.lights[0]; // Assume single channel for RGB device
                                isOn = light?.ison || false;
                                power = data.meters ? data.meters[0].power : null;
                            }

                            results.push({
                                name: shelly.name,
                                isOn: isOn,
                                power: power !== undefined ? power : null,
                                statusClass: isOn ? 'on' : 'off', // Dynamically set status class
                            });
                            
                            console.log(`✓ Successfully fetched ${shelly.name}: ${power !== null ? power + 'W' : 'No power data'}, Status: ${isOn ? 'ON' : 'OFF'}`);
                        } else {
                            console.warn(`✗ No device status data received for ${shelly.name}`);
                            results.push({
                                name: shelly.name,
                                isOn: false,
                                power: null,
                                statusClass: 'off', // Default to off if no data found
                            });
                        }
                        
                        break; // Erfolg - aus der while-Schleife ausbrechen
                        
                    } catch (error) {
                        if (error.response?.status === 429 && retryCount < maxRetries) {
                            console.error(`✗ Rate limit hit for ${shelly.name}: Too Many Requests (Retry ${retryCount + 1}/${maxRetries})`);
                            
                            // Längeres Delay und dann Retry
                            console.log("Waiting 11 seconds before retry...");
                            await new Promise(resolve => setTimeout(resolve, 11000));
                            retryCount++;
                            continue; // Nochmal versuchen
                        } else {
                            // Endgültiger Fehler oder andere Fehler
                            if (error.response?.status === 429) {
                                console.error(`✗ Rate limit hit for ${shelly.name} - no more retries`);
                            } else {
                                console.error(`✗ Error fetching status for ${shelly.name}:`, error.message);
                            }
                            
                            results.push({
                                name: shelly.name,
                                isOn: false,
                                power: null,
                                statusClass: 'off', // Default to off on error
                            });
                            break; // Aus der while-Schleife ausbrechen
                        }
                    }
                }
                
                // Normales Delay zwischen den Anfragen (nur wenn nicht das letzte Gerät)
                if (this.config.shellys.indexOf(shelly) < this.config.shellys.length - 1) {
                    console.log("Waiting 3 seconds before next device...");
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            console.log(`✅ Completed fetching all ${results.length} devices. Sending update...`);
            this.sendSocketNotification("SHELLY_STATUS_UPDATE", results);
            
        } catch (error) {
            console.error("Unexpected error in fetchShellyStatus:", error);
        } finally {
            this.isFetching = false; // Lock immer freigeben
        }
    },
});
