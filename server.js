const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// טוען משתני סביבה
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// אומר לשרת לחשוף את התיקייה public לאינטרנט
app.use(express.static(path.join(__dirname, 'public')));

// התיקון לאקספרס 5: שימוש בביטוי רגולרי במקום כוכבית
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Game Server is running at http://localhost:${PORT}`);
    console.log(`Waiting for Discord Connection...`);
});