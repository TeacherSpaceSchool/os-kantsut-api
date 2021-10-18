const mongoose = require('mongoose');

const SettingSchema = mongoose.Schema({
    lang: {
        type: String,
        default: 'RU'
    },
}, {
    timestamps: true
});

const Setting = mongoose.model('SettingOsCantSytNew', SettingSchema);

module.exports = Setting;