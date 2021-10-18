const mongoose = require('mongoose');

const SellerSchema = mongoose.Schema({
    name: String,
    address: String,
    phone: String
}, {
    timestamps: true
});

SellerSchema.index({name: 1})

const Seller = mongoose.model('SellerOsCantSytNew', SellerSchema);

module.exports = Seller;