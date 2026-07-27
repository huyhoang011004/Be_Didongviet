import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    link: {
        type: String,
        default: '/'
    },
    position: {
        type: String,
        enum: ['carousel', 'right', 'horizontal', 'grid', 'customer_gallery', 'partner_logos'],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export default mongoose.model('Banner', bannerSchema);
