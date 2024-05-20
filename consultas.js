const fs = require("fs");
const path = require("path");
const axios = require("axios");
const uuid = require("uuid");
const Mailgun = require("mailgun-js");

// Agregar email al cual se enviarán los correos
const emailNotificacion = "";
// Configurar apiKey de Mailgun
const mailGunApiKey = "";

// Verificamos que la carpeta datos exista, si no existe la creamos
const datosPath = path.join(__dirname, "datos");
if (!fs.existsSync(datosPath)) {
  fs.mkdirSync(datosPath);
}

/*
 * Descripción de datos roommates.json
 * [
 *   {
 *     "id": "1",
 *     "nombre": "Juan",
 *     "recibe": 0,
 *     "debe": 0
 *   }
 * ]
 */
const roommatesJSON = path.join(datosPath, "roommates.json");
// Verificamos que el archivo exista, si no existe lo creamos
if (!fs.existsSync(roommatesJSON)) {
  fs.writeFileSync(roommatesJSON, JSON.stringify([]));
}

/*
 * Descripción de datos gastos.json
 * [
 *   {
 *     "id": "1",
 *     "roommate": "id del roommate",
 *     "descripcion": "Cena",
 *     "monto": 0
 *   }
 * ]
 */

const gastosJSON = path.join(datosPath, "gastos.json");
// Verificamos que el archivo exista, si no existe lo creamos
if (!fs.existsSync(gastosJSON)) {
  fs.writeFileSync(gastosJSON, JSON.stringify([]));
}

const consultarRoommates = async () => {
  try {
    const data = await fs.readFileSync(roommatesJSON, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.log(error);
    throw new Error("Hubo un error al leer el archivo roommates.json");
  }
};

const consultarRoomatePorNombre = async (nombre) => {
  try {
    const roommates = JSON.parse(await fs.readFileSync(roommatesJSON, "utf8"));
    if (!roommates.some((roommate) => roommate.nombre === nombre))
      throw new Error(`El roommate no existe nombre: "${nombre}"`);
    return roommates.find((roommate) => roommate.nombre === nombre);
  } catch (error) {
    console.log(error);
    throw new Error("Hubo un error al leer el archivo roommates.json");
  }
};

const consultarRoomatePorId = async (id) => {
  try {
    const roommates = JSON.parse(await fs.readFileSync(roommatesJSON, "utf8"));
    if (!roommates.some((roommate) => roommate.id === id))
      throw new Error(`El roommate no existe id: "${id}"`);
    return roommates.find((roommate) => roommate.id === id);
  } catch (error) {
    console.log(error);
    throw new Error("Hubo un error al leer el archivo roommates.json");
  }
};

const actualizarMontoRoommate = async (id, monto, operacion) => {
  try {
    const roommates = JSON.parse(await fs.readFileSync(roommatesJSON, "utf8"));
    const index = roommates.findIndex((roommate) => roommate.id === id);
    switch (operacion) {
      case "agregar":
        if (monto < 0) {
          roommates[index].debe -= monto;
        } else {
          roommates[index].recibe += monto;
        }
        break;
      case "eliminar":
        if (monto < 0) {
          roommates[index].debe += monto;
        } else {
          roommates[index].recibe -= monto;
        }
        break;
      default:
        break;
    }
    await fs.writeFileSync(roommatesJSON, JSON.stringify(roommates));
  } catch (error) {
    console.log(error);
    throw new Error("Hubo un error al actualizar el roommate");
  }
};

const agregarRoomates = async () => {
  try {
    const response = await axios.get("https://randomuser.me/api/");
    const nombre = `${response.data.results[0].name.first} ${response.data.results[0].name.last}`;

    const roommates = JSON.parse(await fs.readFileSync(roommatesJSON, "utf8"));

    const nuevoRoommate = {
      id: uuid.v4(),
      nombre,
      recibe: 0,
      debe: 0,
    };

    roommates.push(nuevoRoommate);
    await fs.writeFileSync(roommatesJSON, JSON.stringify(roommates));
    return roommates;
  } catch (error) {
    console.log(error);
    throw new Error("Hubo un error al agregar un nuevo roommate");
  }
};

const consultarGastos = async () => {
  try {
    let gastos = JSON.parse(await fs.readFileSync(gastosJSON, "utf8"));
    gastos = await Promise.all(
      gastos.map(async (gasto) => {
        const roommate = await consultarRoomatePorId(gasto.roommate);
        return {
          ...gasto,
          roommate: roommate.nombre,
        };
      })
    );
    return gastos.reverse();
  } catch (error) {
    console.log(error);
    throw new Error("Hubo un error al leer el archivo gastos.json");
  }
};

const agregarGasto = async (nombreRoommate, descripcion, monto) => {
  try {
    const roommate = await consultarRoomatePorNombre(nombreRoommate);
    if (!roommate) {
      throw new Error("El roommate no existe");
    }

    const gastos = JSON.parse(await fs.readFileSync(gastosJSON, "utf8"));

    const nuevoGasto = {
      id: uuid.v4(),
      roommate: roommate.id,
      descripcion,
      monto,
    };

    gastos.push(nuevoGasto);
    await actualizarMontoRoommate(roommate.id, monto, "agregar");
    await fs.writeFileSync(gastosJSON, JSON.stringify(gastos));
    enviarCorreo(
      `Se ha agregado un nuevo gasto a ${roommate.nombre} por un monto de ${monto}`
    );
    return gastos;
  } catch (error) {
    console.log(error);
    throw new Error("Hubo un error al agregar un nuevo gasto");
  }
};

const eliminarGasto = async (id) => {
  try {
    const gastos = JSON.parse(await fs.readFileSync(gastosJSON, "utf8"));
    const gasto = gastos.find((gasto) => gasto.id === id);
    if (!gasto) {
      throw new Error("El gasto no existe");
    }

    const index = gastos.findIndex((gasto) => gasto.id === id);
    gastos.splice(index, 1);
    await actualizarMontoRoommate(gasto.roommate, gasto.monto, "eliminar");
    await fs.writeFileSync(gastosJSON, JSON.stringify(gastos));
    const roommate = await consultarRoomatePorId(gasto.roommate);
    enviarCorreo(
      `Se ha eliminado gasto a ${roommate.nombre} por un monto de ${gasto.monto}`
    );
    return gastos;
  } catch (error) {
    console.log(error);
    throw new Error("Hubo un error al eliminar el gasto");
  }
};

const modificarGasto = async (id, descripcion, monto, roommate) => {
  try {
    const gastos = JSON.parse(await fs.readFileSync(gastosJSON, "utf8"));
    const index = gastos.findIndex((gasto) => gasto.id === id);
    if (index == -1) {
      throw new Error("El gasto no existe");
    }

    const roommateAnterior = await consultarRoomatePorId(
      gastos[index].roommate
    );
    const roommateNuevo = await consultarRoomatePorNombre(roommate);

    await actualizarMontoRoommate(
      roommateAnterior.id,
      gastos[index].monto,
      "eliminar"
    );
    await actualizarMontoRoommate(roommateNuevo.id, monto, "agregar");

    gastos[index].descripcion = descripcion;
    gastos[index].monto = monto;
    gastos[index].roommate = roommateNuevo.id;

    await fs.writeFileSync(gastosJSON, JSON.stringify(gastos));
    enviarCorreo(
      `Se ha modificado el gasto de ${roommateAnterior.nombre} a ${roommateNuevo.nombre} por un monto de ${monto}`
    );
    return gastos;
  } catch (error) {
    console.log(error);
    throw new Error("Hubo un error al modificar el gasto");
  }
};

const enviarCorreo = (mensaje) => {
  if (!emailNotificacion || !/@/.test(emailNotificacion)) {
    console.log("No se ha configurado el email de notificación correctamente");
    return;
  }

  if (!mailGunApiKey || mailGunApiKey.length < 10) {
    console.log("No se ha configurado el apiKey de Mailgun correctamente");
    return;
  }

  const mailgun = Mailgun({
    apiKey: mailGunApiKey,
    domain: "sandbox070d94cafc694ca3a2e9d436bfb83439.mailgun.org",
  });

  var data = {
    from: "Roommate <mailgun@sandbox070d94cafc694ca3a2e9d436bfb83439.mailgun.org>",
    to: emailNotificacion,
    subject: "Roommates App Notificación",
    html: mensaje,
  };

  mailgun.messages().send(data, function (err, body) {
    if (err) {
      console.log("Error al tratar de envíar el correo: ", err);
    } else {
      console.log("Correo envíado con éxito: ", body);
    }
  });
};

module.exports = {
  consultarRoommates,
  agregarRoomates,
  consultarGastos,
  agregarGasto,
  eliminarGasto,
  modificarGasto,
};
