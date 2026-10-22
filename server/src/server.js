const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware cơ bản
app.use(cors());
app.use(express.json());

// Route kiểm tra server
app.get('/', (req, res) => {
  res.send('Server To-Do List đang hoạt động!');
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
