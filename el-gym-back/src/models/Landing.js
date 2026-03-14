const mongoose = require('mongoose');

const claseSchema = new mongoose.Schema({
    id: { type: Number },
    title: { type: String, required: true },
    iconName: { type: String, default: 'FaDumbbell' },
    image: { type: String },
    description: { type: String }
});

const coachSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, required: true },
    role: { type: String },
    image: { type: String },
    instagram: { type: String },
    specialty: [{ type: String }],
    bio: { type: String }
});
const heroBgSchema = new mongoose.Schema({
    id: { type: Number },
    url: { type: String, required: true }
});

const landingSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    heroBackgrounds: [heroBgSchema],
    clases: [claseSchema],
    coaches: [coachSchema]
}, { timestamps: true });





module.exports = mongoose.model('Landing', landingSchema);

