require("dotenv").config({ quiet: true });
const express = require("express");

const PORT = process.env.PORT;
const app = express();
app.use(express.static("src"));

app.post("/api/send", (req, res) => {
  res.json({ message: "not implemented" });
});

app.listen(PORT, () => {
  console.log(`Started server at http://localhost:${PORT}`);
});
