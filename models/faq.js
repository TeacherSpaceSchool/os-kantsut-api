const mongoose = require('mongoose');

const FaqSchema = mongoose.Schema({
    url: String,
    title: String,
    video: String,
}, {
    timestamps: true
});

FaqSchema.index({title: 1})

const Faq = mongoose.model('FaqOsCantSytNew', FaqSchema);

module.exports = Faq;