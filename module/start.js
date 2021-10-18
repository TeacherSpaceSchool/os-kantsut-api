const { createAdmin } = require('../module/user');
const { createCategoryOther } = require('../module/category');
const { createSetting } = require('../module/setting');
const { Worker, isMainThread } = require('worker_threads');
const { testAutoApplication } = require('../thread/autoApplication');

let startResetUnloading = async () => {
    if(isMainThread) {
        let w = new Worker('./thread/resetUnloading.js', {workerData: 0});
        w.on('message', (msg) => {
            console.log('ResetUnloading: '+msg);
        })
        w.on('error', console.error);
        w.on('exit', (code) => {
            if(code !== 0)
                console.error(new Error(`ResetUnloading stopped with exit code ${code}`))
        });
        console.log('ResetUnloading '+w.threadId+ ' run')
    }
}

let startAutoApplication = async () => {
    if(isMainThread) {
        let w = new Worker('./thread/autoApplication.js', {workerData: 0});
        w.on('message', (msg) => {
            console.log('AutoApplication: '+msg);
        })
        w.on('error', console.error);
        w.on('exit', (code) => {
            if(code !== 0)
                console.error(new Error(`AutoApplication stopped with exit code ${code}`))
        });
        console.log('AutoApplication '+w.threadId+ ' run')
    }
}

let start = async () => {
    //await testAutoApplication()

    await startResetUnloading();
    await startAutoApplication();

    await createCategoryOther();
    await createAdmin();
    await createSetting();
}

module.exports.start = start;
