const Mongoose = require('mongoose');
const slug = require('mongoose-slug-generator');
const { Schema } = Mongoose;

const options = {
  separator: '-',
  lang: 'en',
  truncate: 120
};

Mongoose.plugin(slug, options);

const ProductSchema = new Schema({
    sku: {
        type: String
      },
    slug: {
      type: String,
      slug: 'name',
      unique: true
    },
    description: {
      type: String,
      trim: true
    },
    taxable: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      default: null
    },
    updated: Date,
    created: {
      type: Date,
      default: Date.now
    }
  });

// Product Schema
const VariantSchema = new Schema({
  name: {
    type: String,
    trim: true
  },
  images: {
    type: Array
  },
  quantity: {
    type: Number
  },
  price: {
    type: Number
  },
  product: [ProductSchema],
  updated: Date,
  created: {
    type: Date,
    default: Date.now
  }
});

module.exports = Mongoose.model('Variant', VariantSchema);
