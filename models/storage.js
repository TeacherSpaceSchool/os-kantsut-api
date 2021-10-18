const mongoose = require('mongoose');

const StorageSchema = mongoose.Schema({
    count: Number,
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemOsCantSytNew'
    }
}, {
    timestamps: true
});

StorageSchema.index({item: 1})


const Storage = mongoose.model('StorageOsCantSytNew', StorageSchema);

module.exports = Storage;