const mongoose = require('mongoose')

// Definir el esquema y el modelo de Mongoose
const productSchema = new mongoose.Schema({
  codigo: {
    type: Number,
    required: true
  },
  nombre: {
    type: String,
    required: true
  },
  precio: {
    type: Number,
    required: true
  },
  categoria: {
    type: String,
    required: true
  }
})
//const Collection = mongoose.model('products', productsSchema)
const COLLECTION_NAME = process.env.COLLECTION_NAME
const Collection = mongoose.model(COLLECTION_NAME, productSchema)

module.exports = Collection
