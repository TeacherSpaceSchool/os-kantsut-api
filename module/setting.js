const Setting = require('../models/setting');

module.exports.createSetting = async() => {
    let setting = await Setting.findOne()
    if(!setting) {
        setting = new Setting({
            lang: 'RU'
        });
        await Setting.create(setting)
    }

}