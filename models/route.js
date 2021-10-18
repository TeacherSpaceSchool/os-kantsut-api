const mongoose = require('mongoose');

const ApplicationRouteSchema = mongoose.Schema({
    roles: [String],
    specialists: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    }]
}, {
    timestamps: true
});


const ApplicationRoute = mongoose.model('ApplicationRouteOsCantSytNew', ApplicationRouteSchema);

module.exports = ApplicationRoute;