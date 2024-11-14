const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
    start: function () {
        this.config = {};

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
        const results = [];

        if (!this.config.shellys || !Array.isArray(this.config.shellys)) {
            console.error("No valid shellys configuration found or 'shellys' is not an array.");
            return;
        }

        for (const shelly of this.config.shellys) {
            try {
                const response = await axios.post(
                    `${this.config.serverUri}/device/status`,
                    `id=${shelly.id}&auth_key=${this.config.authKey}`
                );

                const data = response.data?.data?.device_status;

                if (data) {
                    let isOn = false;
                    let power = null;

                    // Check for Gen 1/2 structure (relay-based devices)
                    if (data.relays) {
                        isOn = data.relays[0].ison;
                        power = data.meters ? data.meters[0].power : null;
                    }
                    // Check for Gen 3 structure (pm1:0 devices)
                    else if (data["pm1:0"]) {
                        isOn = true;  // Assume true if data exists for the device
                        power = data["pm1:0"].apower; // Use 'apower' from pm1:0
                    }
                    // Check for "switch:0" structure
                    else if (data["switch:0"]) {
                        isOn = data["switch:0"].output; // Use 'output' for on/off status
                        power = data["switch:0"].apower; // Use 'apower' for power
                    }

                    results.push({
                        name: shelly.name,
                        isOn: isOn,
                        power: power !== undefined ? power : null,
                        statusClass: isOn ? 'on' : 'off', // Dynamically set status class
                    });
                } else {
                    results.push({
                        name: shelly.name,
                        isOn: false,
                        power: null,
                        statusClass: 'off', // Default to off if no data found
                    });
                }
            } catch (error) {
                console.error(`Error fetching status for ${shelly.name}:`, error);
                results.push({
                    name: shelly.name,
                    isOn: false,
                    power: null,
                    statusClass: 'off', // Default to off on error
                });
            }
        }

        this.sendSocketNotification("SHELLY_STATUS_UPDATE", results);
    },
});
