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
app.get('/productos/:id', (req, res) => {
  console.log('/productos/:id')
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.error('El Id ingresado está mal formado!!!!')
    return res.status(404).json({
      message: 'El Id ingresado está mal formado!!!!',
      error: { status: 404 }
    })
  } else {
    console.log("El ID es válido")
    console.log(id)
    Collection.findById(id)
      .then((document) => {
        if (document) {
          if (Object.values(document).length > 0) {
            console.log(Object.values(document).length)
          }
          res.status(200).json(document)
        } else {
          console.error('El Id ingresado no existe!')
          return res.status(404).json({
            message: 'El Id ingresado no existe!',
            error: { status: 404 }
          })
        }
      })
      .catch((error) => {
        console.error('Error al obtener el producto! ', error)
        return res.status(500).json({
          message: 'Error al obtener el producto',
          error: { status: 500 }
        })
      })
  }
})

// Obtener todos los productos y opcionalmente de una query de categoría y/o nombre.
app.get('/productos', (req, res) => {
  const { codigo, nombre, categoria } = req.query
  let query = {}

  if (codigo) {
    const validatedCode = isNumeric(codigo) ? parseInt(codigo, 10) : -1
    //console.log(validatedCode.toString().length)
    if (validatedCode === -1 || validatedCode.toString().length > 4) {
      console.error('El código ingresado está mal formado!')
      return res.status(404).json({
        message: 'El código ingresado está mal formado!',
        error: { status: 404 }
      })
    } else {
      query = { codigo: validatedCode }
    }
  } else if (categoria && nombre) {
    query = {
      $and: [
        { categoria: { $regex: new RegExp(createAccentInsensitiveRegex(categoria), "i") } },
        { nombre: { $regex: new RegExp(createAccentInsensitiveRegex(nombre), "i") } }
      ]
    }
  } else if (categoria) {
    query = { categoria: { $regex: new RegExp(createAccentInsensitiveRegex(categoria), "i") } }
  } else if (nombre) {
    query = { nombre: { $regex: new RegExp(createAccentInsensitiveRegex(nombre), "i") } }
  }
  console.log(query)
  Collection.find(query)
    .then((documents) => {
      if (Array.isArray(documents) && documents.length > 0) {
        res.status(200).json(documents)
      } else {
        console.error('No se encontraron productos!')
        console.log(documents)
        return res.status(404).json({
          message: 'No se encontraron productos!',
          error: { status: 404 }
        })
      }
    })
    .catch((error) => {
      console.error('Error al obtener los productos: ', error)
      return res.status(500).json({
        message: 'Error al obtener los productos!',
        error: { status: 500 }
      })
    })
})


// Ruta para manejar el POST y agregar un Producto.
app.post('/productos', validateRequestBody, (req, res) => {
  const newProduct = new Collection(req.body)
  //console.log(newProduct)
  generateUniqueCodigo(newProduct.codigo)
    .then(codigoUnico => {
      newProduct.codigo = codigoUnico
      //console.log(newProduct)
      return newProduct.save()
    })
    .then(savedProduct => {
      //Created
      console.log("Documento insertado correctamente")
      res.status(201).json({ mensaje: "Documento insertado correctamente", datos: savedProduct })
    })
    .catch((error) => {
      console.error('Error al agregar el producto! ', error)
      return res.status(500).json({
        message: 'Error al agregar el producto!',
        error: {
          status: 500,
          description: error
        }
      })
    })
})

//Borrar un producto
app.delete('/productos/:id', (req, res) => {
  const { id } = req.params
  Collection.findByIdAndDelete(id)
    .then((result) => {
      if (result) {
        console.log('Producto borrado con exito!')
        console.log(result)
        //Si el documento se elimina correctamente, devuelve un 204 No Content.
        // , datos: result } no se envia si el status es 404
        res.status(204).json({ message: 'Producto borrado con exito' })
      } else {
        console.error('No se encontró el producto solicitado para ser borrado!')
        return res.status(404).json({
          message: 'No se encontró el producto solicitado para ser borrado!',
          error: { status: 404 }
        })
      }
    })
    .catch((error) => {
      console.error('Error al borrar el producto! ', error)
      return res.status(500).json({
        message: 'Error al borrar el producto!',
        error: {
          status: 500,
          description: error
        }
      })
    })
})

//Modificar/Actualizar un producto parcialmente.
app.patch('/productos/:id', (req, res) => {
  const { id } = req.params
  const body = req.body

  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.error('El Id ingresado está mal formado, no se modifica!!')
    return res.status(400).json({
      message: 'El Id ingresado está mal formado, no se modifica!',
      error: { status: 400 }
    })
  }
  // Validar que el cuerpo de la solicitud contiene datos
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({
      message: 'El cuerpo de la solicitud no está correctamente instanciado',
      error: { status: 400 }
    })
  }
  if (!body.precio) {
    return res.status(400).json({
      message: 'El cuerpo de la solicitud no informa el precio a modificar',
      error: { status: 400 }
    })
  }
  const updateData = { precio: body.precio }
  console.log(updateData)
  Collection.findByIdAndUpdate(id, updateData, { new: true, overwrite: true, runValidators: true })
    .then((result) => {
      if (result) {
        console.log('Producto actualizado con exito!')
        console.log(result)
        //Si el documento se modifica correctamente, devuelve un 204 No Content.
        // , datos: result } no se envia si el status es 404
        res.status(204).json({ message: 'Producto actualizado con exito!' })
      } else {
        console.log('No se pudo actualizar el producto!')
        res.status(404).json({ message: 'No se pudo actualizar el producto!' })
      }
    })
    .catch((error) => {
      console.error('Error al modificar el producto! ', error)
      return res.status(500).json({
        message: 'Error al modificar el producto!',
        error: {
          status: 500,
          description: error
        }
      })
    })
})


// Middleware para manejar rutas inválidas
app.use((req, res, next) => {
  const err = new Error('Ruta no encontrada')
  err.status = 404
  next(err)
})


// Middleware de manejo de errores
app.use((err, req, res, next) => {
  //console.error(err.stack) 
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



//***************************************************************/
// Funciones
//***************************************************************/

function isNumeric(valor) {
  //return typeof valor === 'number' && !isNaN(valor) 
  return !isNaN(valor)
}

// Función para construir la expresión regular que ignore acentos
function createAccentInsensitiveRegex(str) {
  const accentMap = {
    a: 'aàáâãäå',
    e: 'eèéêë',
    i: 'iìíîï',
    o: 'oòóôõö',
    u: 'uùúûü',
    A: 'aàáâãäå',
    E: 'eèéêë',
    I: 'iìíîï',
    O: 'oòóôõö',
    U: 'uùúûü',
    c: 'cç',
    n: 'nñ'
  }
  let pattern = ''
  for (let char of str) {
    if (accentMap[char]) {
      pattern += `[${accentMap[char]}]`
    } else {
      pattern += char
    }
  }
  return new RegExp(pattern, 'i')
}


// // Función para generar un código único
// function generateUniqueCodigo() {
//   function generateRandomNumber() {
//     return Math.floor(Math.random() * 9000) + 1000
//   }
//   function checkCodigo(codigo) {
//     return Collection.findOne({ codigo: codigo })
//       .then(result => {
//         if (!result) {
//           return codigo
//         }
//         // Si el código ya existe, generar uno nuevo y verificar nuevamente
//         return checkCodigo(generateRandomNumber())
//       })
//   }
//   // Iniciar con un nuevo código y verificar
//   return checkCodigo(generateRandomNumber())
// }

// Función para generar un código entre 1000 y 9999
function generateRandomCodigo() {
  return Math.floor(Math.random() * 9000) + 1000
}

// Función para encontrar un código único en la Colección de MongoDB.
function generateUniqueCodigo(codParam) {
  //console.log(codParam)
  function checkCodigo(codigo) {
    return Collection.findOne({ codigo: codigo })
      .then(result => {
        if (!result) {
          return codigo
        }
        // Si el código ya existe, generar uno nuevo y verificar nuevamente
        console.log(`El codigo ${codigo} existe! Se busca uno nuevo!`)
        return checkCodigo(generateRandomCodigo())
      })
  }
  // if (codParam) {
  //   // Intenta con el código recibido y verifica
  //   return checkCodigo(codParam)
  // } else {
  //   // Iniciar con un nuevo código y verificar
  //   return checkCodigo(generateRandomCodigo())
  // }
  // Intenta con el código recibido y verifica
  // ó
  // Iniciar con un nuevo código y verificar
  return checkCodigo(codParam ? codParam : generateRandomCodigo())
}

// Función de validación
function validateRequestBody(req, res, next) {
  const ObjetoReqBody = req.body
  let body = {}

  if (ObjetoReqBody["codigo"]) {
    //console.log(ObjetoReqBody["codigo"] + " Vino este ")
    body = ObjetoReqBody
  }
  else {
    //console.log(ObjetoReqBody["codigo"] + "  No vino")
    const nuevaPropiedad = { codigo: generateRandomCodigo() }
    // Crear un nuevo objeto y agregar la nueva propiedad primero
    body = { ...nuevaPropiedad, ...ObjetoReqBody }
  }
  console.log(body)

  // Definición de las validaciones
  const validations = {
    codigo: value => typeof value === 'number' && value > 1000 && value < 10000,
    nombre: value => typeof value === 'string' && value.trim().length > 0,
    precio: value => typeof value === 'number' && value > 0,
    categoria: value => typeof value === 'string' && value.trim().length > 0
  }
  // Recorrer y validar cada campo
  for (const [key, validate] of Object.entries(validations)) {
    if (!validate(body[key])) {
      return res.status(400).json({
        message: `Campo inválido: ${key}`,
        error: {
          status: 400,
          description: `Campo inválido/requerido:`,
          field: `${key}`
        }
      })
    }
  }
  // Si todas las validaciones pasan, continuar con la siguiente función de middleware
  req.body = body
  next()
}