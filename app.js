const express = require("express");
const path = require("path");

const {
  consultarRoommates,
  agregarRoomates,
  consultarGastos,
  agregarGasto,
  eliminarGasto,
  modificarGasto,
} = require("./consultas");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.get("/roommates", async (req, res) => {
  try {
    const roommates = await consultarRoommates();
    res.send({ roommates });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

app.post("/roommate", async (req, res) => {
  try {
    const roommates = await agregarRoomates();
    res.send({ roommates });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

app.get("/gastos", async (req, res) => {
  try {
    const gastos = await consultarGastos();
    res.send({ gastos });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

app.post("/gasto", async (req, res) => {
  try {
    const { roommate, descripcion, monto } = req.body;
    const gastos = await agregarGasto(roommate, descripcion, monto);
    res.send({ gastos });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

app.delete("/gasto", async (req, res) => {
  try {
    const { id } = req.query;
    const gastos = await eliminarGasto(id);
    res.send({ gastos });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

app.put("/gasto", async (req, res) => {
  try {
    const { id } = req.query;
    const { descripcion, monto, roommate } = req.body;
    const gastos = await modificarGasto(id, descripcion, monto, roommate);
    res.send({ gastos });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(3000, () => {
  console.log("Servidor corriendo en el puerto 3000");
});
