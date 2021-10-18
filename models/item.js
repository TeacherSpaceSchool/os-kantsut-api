const mongoose = require('mongoose');

const ItemSchema = mongoose.Schema({
    sync: Number,
    name: String,
    GUID: String,
    lastPrice: [{
        name: String,
        value: Number
    }],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryOsCantSytNew'
    }
}, {
    timestamps: true
});

ItemSchema.index({name: 1})
ItemSchema.index({category: 1})
ItemSchema.index({GUID: 1})

const Item = mongoose.model('ItemOsCantSytNew', ItemSchema);

module.exports = Item;