import express from "express";
import SetRoutes from "./routes/index"; // Correct import path

const app = express();

const PORT = process.env.PORT || 5000;

SetRoutes(app); // Correct variable name 'app' instead of 'server'

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
