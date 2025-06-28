const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

let lastAlert = null;

app.use(express.json());

app.post("/alert", (req, res) => {
    lastAlert = {
        message: req.body.message,
        timestamp: new Date()
    };
    res.send({ status: "ok" });
});

app.get("/alert", (req, res) => {
    if (lastAlert) {
        res.send(lastAlert);
        lastAlert = null; // clear after sent
    } else {
        res.status(204).send(); // No content
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
