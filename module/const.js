const Jimp = require('jimp');
const randomstring = require('randomstring');
const app = require('../app');
const fs = require('fs');
const path = require('path');

const urlMain = `${process.env.URL.trim()}:3000`,
    adminLogin = 'admin',
    skip = 1,
    adminPass = '6FjHxteZVp',
    adminPin = '9865'
const validMail = (mail) =>
{
    return /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+([^<>()\.,;:\s@\"]{2,}|[\d\.]+))$/.test(mail);
}
const validPhone = (phone) =>
{
    return /^[+]{1}996[0-9]{9}$/.test(phone);
}

const getGeoDistance = (lat1, lon1, lat2, lon2) => {
    lat1 = parseFloat(lat1)
    lon1 = parseFloat(lon1)
    lat2 = parseFloat(lat2)
    lon2 = parseFloat(lon2)
    let deg2rad = Math.PI / 180;
    lat1 *= deg2rad;
    lon1 *= deg2rad;
    lat2 *= deg2rad;
    lon2 *= deg2rad;
    let diam = 12742000; // Diameter of the earth in km (2 * 6371)
    let dLat = lat2 - lat1;
    let dLon = lon2 - lon1;
    let a = (
        (1 - Math.cos(dLat)) +
        (1 - Math.cos(dLon)) * Math.cos(lat1) * Math.cos(lat2)
    ) / 2;
    return parseInt(diam * Math.asin(Math.sqrt(a)));
}
module.exports.weekDay = [
    'ВС',
    'ПН',
    'ВТ',
    'СР',
    'ЧТ',
    'ПТ',
    'СБ',
]

const checkInt = (int) => {
    return isNaN(parseInt(int))?0:parseInt(int)
}

const checkFloat = (float) => {
    float = parseFloat(float)
    return isNaN(float)?0:Math.round(float * 1000)/1000
}

module.exports.saveFile = (stream, filename) => {
    return new Promise((resolve) => {
        filename = `${randomstring.generate(7)}${filename}`;
        let filepath = path.join(app.dirname, 'public', 'images', filename)
        let fstream = fs.createWriteStream(filepath);
        stream.pipe(fstream)
        fstream.on('finish', async () => {
            resolve(`/images/${filename}`)
        })
    })
}

module.exports.saveImage = (stream, filename) => {
    return new Promise(async (resolve) => {
        let randomfilename = `${randomstring.generate(7)}${filename}`;
        let filepath = path.join(app.dirname, 'public', 'images', randomfilename)
        let fstream = fs.createWriteStream(filepath);
        stream.pipe(fstream)
        fstream.on('finish', async () => {
            let image = await Jimp.read(filepath)
            if(image.bitmap.width>800||image.bitmap.height>800) {
                randomfilename = `${randomstring.generate(7)}${filename}`;
                let filepathResize = path.join(app.dirname, 'public', 'images', randomfilename)
                image.resize(800, Jimp.AUTO)
                    .quality(80)
                    .write(filepathResize);
                fs.unlink(filepath, ()=>{
                    resolve(`/images/${randomfilename}`)
                })
            }
            else
                resolve(`/images/${randomfilename}`)
        })
    })
}

module.exports.deleteFile = (oldFile) => {
    return new Promise((resolve) => {
        oldFile = oldFile.replace(urlMain, '')
        oldFile = path.join(app.dirname, 'public', oldFile)
        fs.unlink(oldFile, ()=>{
            resolve()
        })
    })
}
const pdDDMMYYYY = (date) =>
{
    date = new Date(date)
    date = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getFullYear()}`
    return date
}
const pdDDMMYYHHMM = (date) =>
{
    date = new Date(date)
    date = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getFullYear()} ${date.getHours()<10?'0':''}${date.getHours()}:${date.getMinutes()<10?'0':''}${date.getMinutes()}`
    return date
}
const pdHHMM = (date) =>
{
    date = new Date(date)
    date = `${date.getHours()<10?'0':''}${date.getHours()}:${date.getMinutes()<10?'0':''}${date.getMinutes()}`
    return date
}

module.exports.codeByCurrencys = {
    'сом': '417',
    'тенге': '398',
    'рубль': '643',
    'доллар': '840',
    'евро': '978',
    'вон': '410',
    'гривна': '980',
    'дирхам': '784',
    'драм': '051',
    'иена': '392',
    'крона': '203',
    'лари': '981',
    'лев': '975',
    'манат': '944',
    'песо': '032',
    'реал': '986',
    'рупия': '356',
    'сомони': '972',
    'сум': '860',
    'форинт': '348',
    'франк': '756',
    'шекель': '376',
    'шиллинг': '404',
    'юань': '156',
    'фунт': '826'
}

module.exports.currencysByCode = {
    '417': 'сом',
    '398': 'тенге',
    '643': 'рубль',
    '840': 'доллар',
    '978': 'евро',
    '410': 'вон',
    '980': 'гривна',
    '784': 'дирхам',
    '051': 'драм',
    '392': 'иена',
    '203': 'крона',
    '981': 'лари',
    '975': 'лев',
    '944': 'манат',
    '032': 'песо',
    '986': 'реал',
    '356': 'рупия',
    '972': 'сомони',
    '860': 'сум',
    '348': 'форинт',
    '756': 'франк',
    '376': 'шекель',
    '404': 'шиллинг',
    '156': 'юань',
    '826': 'фунт'
}


module.exports.getGeoDistance = getGeoDistance;
module.exports.checkInt = checkInt;
module.exports.checkFloat = checkFloat;
module.exports.pdHHMM = pdHHMM;
module.exports.pdDDMMYYYY = pdDDMMYYYY;
module.exports.pdDDMMYYHHMM = pdDDMMYYHHMM;
module.exports.skip = skip;
module.exports.validPhone = validPhone;
module.exports.validMail = validMail;
module.exports.adminPass = adminPass;
module.exports.adminPin = adminPin;
module.exports.adminLogin = adminLogin;
module.exports.urlMain = urlMain;
