const mongoose = require('mongoose');

const CategorySchema = mongoose.Schema({
    name: String,
    del: String,
    GUID: String,
    suppliers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    }]
}, {
    timestamps: true
});


const Category = mongoose.model('CategoryOsCantSytNew', CategorySchema);

module.exports = Category;