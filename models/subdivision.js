const mongoose = require('mongoose');

const SubdivisionSchema = mongoose.Schema({
    name: String,
    division: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DivisionOsCantSytNew'
    }
}, {
    timestamps: true
});

SubdivisionSchema.index({name: 1})

const Subdivision = mongoose.model('SubdivisionOsCantSytNew', SubdivisionSchema);

module.exports = Subdivision;