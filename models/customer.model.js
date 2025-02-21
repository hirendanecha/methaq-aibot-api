const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSchema = new Schema({
    name: { type: String },
    email: { type: String },
    countryCode: { type: String },
    phone: { type: String },
    notes: [{ type: String }],
    isGuestUser: { type: Boolean, default: false },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },
}, {
    timestamps: true,
});

CustomerSchema.index({
    name: "text",
    email: "text",
    phone: "text",
    notes: "text",
});

const CustomerModel = mongoose.model('customers', CustomerSchema);
module.exports = CustomerModel;
