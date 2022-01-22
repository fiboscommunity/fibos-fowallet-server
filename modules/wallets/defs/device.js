module.exports = db => {
    let Devices = db.define('device', {
        marker: {
            type: "text",
            size: 256,
        },
        devicetype: {
            required: true,
            type: "enum",
            values: ["PC", "IOS", "ANDROID", "HUAWEI", "XIAOMI"],
            defaultValue: "PC"
        },
        devicetoken: {
            required: true,
            type: "text",
            size: 256,
        },
        language: {
            required: true,
            type: "enum",
            values: ['zh', 'en']
        },
        extend: Object,
    });

    return Devices;
}