process.loadEnvFile()
const express = require('express')
const mongoose = require('mongoose')
const app = express()
const connectDB = require('./src/database')
const port = process.env.PORT ?? 3000
const morgan = require('morgan')
const Collection = require('./src/product')

// Conectar a MongoDB usando Mongoose
connectDB()

//Middleware
app.use(express.json())
app.use(morgan('dev'))

//Ruta principal
app.get('/', (req, res) => {
  res.json('Bienvenido a la API de Supermercado !')
})

//Mostrar un producto por codigo
app.get('/productos/:codigo', (req, res) => {
  console.log('/productos/:codigo')
  const query = {}
  const { codigo } = req.params
  console.log(codigo)
  console.log(esNumerico(codigo))
  const validatedCode = esNumerico(codigo) ? parseInt(codigo, 10) : null

  if (validatedCode === null) {
    console.error('El código ingresado está mal formado!')
    return res.status(404).json({
      error: '404',
      message: 'El código ingresado está mal formado!'
    })
  } else {
    const query = { codigo: validatedCode }
    console.log(query)
    Collection.find(query)
      .then((document) => {
        if (Array.isArray(document) && document.length > 0) {
          //console.log('Producto encontrado:', document)
          res.status(200).json(document)
        } else {
          console.error('El código ingresado no existe!')
          return res.status(404).json({
            error: '404',
            message: 'El código ingresado no existe!'
          })
        }
      })
      .catch((error) => {
        console.error('Error al obtener el producto! ', error)
        return res.status(500).json({
          error: '500',
          message: 'Error al obtener el producto'
        })
      })
  }
})

// Obtener todos los productos y opcionalmente de una categoría.
app.get('/productos', (req, res) => {
  const { categoria } = req.query
  const query = !categoria ? {} : { categoria: { $regex: categoria, $options: 'i' } }
  console.log(query)
  Collection.find(query)
    .then((documents) => {
      if (Array.isArray(documents) && documents.length > 0) {
        res.status(200).json(documents)
      } else {
        console.error('No se encontraron productos!')
        return res.status(404).json({
          error: '404',
          message: 'No se encontraron productos!'
        })
      }
    })
    .catch((error) => {
      console.error('Error al obtener los productos: ', error)
      res.status(500).json({
        error: '500',
        message: 'Error al obtener los productos'
      })
    })
})


// Middleware para manejar rutas inválidas
app.use((req, res, next) => {

  //throw new Error('Ruta no encontrada')
  const err = new Error('Ruta no encontrada');
  err.status = 404
  next(err)
})

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  //console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {},

  })
  //error: process.env.NODE_ENV === 'production' ? {} : err,
})


//Inicializamos el servidor
app.listen(port, () => {
  console.log(`Example app listening on http://localhost:${port}`)
})

function esNumerico(valor) {
  //return typeof valor === 'number' && !isNaN(valor);
  return !isNaN(valor);
}