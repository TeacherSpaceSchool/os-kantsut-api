const { isMainThread } = require('worker_threads');
const connectDB = require('../models/index');
const cron = require('node-cron');
const app = require('../app');
const fs = require('fs');
const path = require('path');
connectDB.connect();
if(!isMainThread) {
    cron.schedule('1 3 * * *', async() => {
        fs.readdir(path.join(app.dirname, 'public', 'xlsx'), function(err, items) {
            for(let i=0; i<items.length; i++){
                fs.unlink(path.join(app.dirname, 'public', 'xlsx', items[i]), ()=>{
                    console.log(`delete ${items[i]}`);
                })
            }
        });
    });
}